import { CommentSegment, linkifyComment } from './comment-linkify';
import { AuthService } from '../../../services/auth/auth.service';
import { ReviewService } from '../../../services/reviews/review.service';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors } from '@angular/forms';
import { LoggerService } from '@drevo-web/core';
import {
    ApprovalStatus,
    REVIEW_COMMENT_REQUIRED_STATUSES,
    REVIEW_STATUS_CLASS,
    REVIEW_STATUS_ICONS,
    REVIEW_STATUS_LABELS,
    REVIEW_TALLY_STATUSES,
    Review,
    ReviewStatus,
    ReviewStatusClass,
    ReviewTarget,
} from '@drevo-web/shared';
import { ButtonComponent, ConfirmationService, FormatDatePipe, IconComponent, TextInputComponent } from '@drevo-web/ui';
import { filter, of, switchMap, tap } from 'rxjs';
import { catchError } from 'rxjs/operators';

/** A status pill descriptor for the vote form / tally header. */
interface StatusOption {
    readonly status: ReviewStatus;
    readonly label: string;
    readonly icon: string;
    readonly cssClass: ReviewStatusClass;
}

/** A review with a non-empty comment, pre-split for declarative rendering. */
interface CommentItem {
    readonly review: Review;
    readonly icon: string;
    readonly cssClass: ReviewStatusClass;
    readonly segments: readonly CommentSegment[];
    readonly canDelete: boolean;
}

/** A header tally entry: a verdict status with the names that cast it. */
interface TallyItem {
    readonly status: ReviewStatus;
    readonly label: string;
    readonly icon: string;
    readonly cssClass: ReviewStatusClass;
    readonly voters: readonly string[];
}

const ALL_STATUSES: readonly ReviewStatus[] = [
    ReviewStatus.Undecided,
    ReviewStatus.Approve,
    ReviewStatus.Suggest,
    ReviewStatus.Disagree,
];

const STATUS_OPTIONS: readonly StatusOption[] = ALL_STATUSES.map(status => ({
    status,
    label: REVIEW_STATUS_LABELS[status],
    icon: REVIEW_STATUS_ICONS[status],
    cssClass: REVIEW_STATUS_CLASS[status],
}));

/** Comment is required for Suggest/Disagree (form-group validator). */
function commentRequiredValidator(control: AbstractControl): ValidationErrors | null {
    const status = control.get('status')?.value as ReviewStatus | undefined;
    const comment = ((control.get('comment')?.value as string | undefined) ?? '').trim();
    if (status !== undefined && REVIEW_COMMENT_REQUIRED_STATUSES.includes(status) && comment.length === 0) {
        return { commentRequired: true };
    }
    // Angular's ValidatorFn contract requires null (not undefined) for "valid".
    // eslint-disable-next-line no-null/no-null
    return null;
}

/**
 * People's review (premoderation) block: votes list + tally header + vote form
 * with delete. Reusable across the version view and the diff page — it loads its
 * own reviews and composes all visibility/permission rules on the client (the
 * backend stays the authoritative validator on set/delete).
 */
@Component({
    selector: 'app-review-block',
    imports: [ReactiveFormsModule, IconComponent, ButtonComponent, FormatDatePipe, TextInputComponent],
    templateUrl: './review-block.component.html',
    styleUrl: './review-block.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewBlockComponent {
    readonly versionId = input.required<number>();
    readonly author = input.required<string>();
    readonly approved = input.required<ApprovalStatus>();
    readonly type = input<ReviewTarget>('article');

    private readonly reviewService = inject(ReviewService);
    private readonly authService = inject(AuthService);
    private readonly confirmation = inject(ConfirmationService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly logger = inject(LoggerService).withContext('ReviewBlock');

    private readonly currentUser = toSignal(this.authService.user$);

    /** Loaded votes: reseeded on version change, replaced after set/delete. */
    private readonly _reviews = signal<readonly Review[]>([]);
    readonly reviews = this._reviews.asReadonly();

    readonly statusOptions = STATUS_OPTIONS;

    readonly form = new FormGroup(
        {
            status: new FormControl<ReviewStatus>(ReviewStatus.Undecided, { nonNullable: true }),
            comment: new FormControl<string>('', { nonNullable: true }),
        },
        { validators: commentRequiredValidator },
    );

    private readonly userName = computed(() => this.currentUser()?.name);
    private readonly isModerator = computed(() => this.currentUser()?.permissions.canModerate ?? false);

    readonly isOwnVersion = computed(() => {
        const name = this.userName();
        return name !== undefined && name.length > 0 && this.author() === name;
    });
    readonly versionPending = computed(() => this.approved() === ApprovalStatus.Pending);
    readonly canReview = computed(() => (this.currentUser()?.isReviewer ?? false) && this.versionPending());

    private readonly myReview = computed(() => {
        const name = this.userName();
        return name === undefined ? undefined : this.reviews().find(review => review.reviewer === name);
    });

    /** Pills shown in the form: hide "Одобряю" on the author's own version. */
    readonly formOptions = computed(() =>
        this.isOwnVersion()
            ? this.statusOptions.filter(option => option.status !== ReviewStatus.Approve)
            : this.statusOptions,
    );

    readonly tally = computed<readonly TallyItem[]>(() => {
        const reviews = this.reviews();
        return REVIEW_TALLY_STATUSES.map(status => ({
            status,
            label: REVIEW_STATUS_LABELS[status],
            icon: REVIEW_STATUS_ICONS[status],
            cssClass: REVIEW_STATUS_CLASS[status],
            voters: reviews.filter(review => review.status === status).map(review => review.reviewer),
        })).filter(item => item.voters.length > 0);
    });

    readonly commentItems = computed<readonly CommentItem[]>(() =>
        this.reviews()
            .filter(review => review.comment.length > 0)
            .map(review => ({
                review,
                icon: REVIEW_STATUS_ICONS[review.status],
                cssClass: REVIEW_STATUS_CLASS[review.status],
                segments: linkifyComment(review.comment),
                canDelete: this.canDelete(review),
            })),
    );

    readonly showBlock = computed(() => this.reviews().length > 0 || this.canReview());

    /** Form-state tick: recompute save/clear enablement on any form event. */
    private readonly formEvents = toSignal(this.form.events);

    readonly canSave = computed(() => {
        this.formEvents();
        return this.form.dirty && this.form.valid;
    });
    readonly canClear = computed(() => {
        this.formEvents();
        return this.form.controls.comment.value.trim().length > 0;
    });

    constructor() {
        // Load votes on every version change; feature-off/forbidden → empty list
        // (tost is suppressed at the HTTP layer via SKIP_ERROR_NOTIFICATION).
        toObservable(this.versionId)
            .pipe(
                // Discard any unsaved draft when switching versions so it cannot
                // leak into the next version (the component is reused, not
                // recreated, across version param changes).
                tap(() => this.form.markAsPristine()),
                switchMap(versionId =>
                    this.reviewService
                        .getReviews(this.type(), versionId)
                        .pipe(catchError(() => of<readonly Review[]>([]))),
                ),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe(reviews => this._reviews.set(reviews));

        // Keep the form in sync with the saved vote when reviews (re)load, but
        // never clobber unsaved edits in progress.
        effect(() => {
            const mine = this.myReview();
            if (this.form.pristine) {
                this.form.setValue({
                    status: mine?.status ?? ReviewStatus.Undecided,
                    comment: mine?.comment ?? '',
                });
            }
        });
    }

    canDelete(review: Review): boolean {
        return this.isModerator() || (review.reviewer === this.userName() && this.versionPending());
    }

    submit(): void {
        if (!this.canSave()) {
            return;
        }
        const { status, comment } = this.form.getRawValue();
        const versionId = this.versionId();
        this.reviewService
            .setReview({ type: this.type(), versionId, status, comment: comment.trim() })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: reviews => {
                    this.form.markAsPristine();
                    this._reviews.set(reviews);
                    this.logger.info('Review submitted', { versionId, status });
                },
                error: error => this.logger.error('Failed to submit review', error),
            });
    }

    clearComment(): void {
        this.form.controls.comment.setValue('');
        this.form.controls.comment.markAsDirty();
    }

    deleteReview(review: Review): void {
        const versionId = this.versionId();
        this.confirmation
            .open({
                title: 'Удаление отзыва',
                message: `Удалить отзыв пользователя ${review.reviewer}?`,
                buttons: [
                    { key: 'cancel', label: 'Отмена', variant: 'text' },
                    { key: 'confirm', label: 'Удалить', accent: 'danger' },
                ],
            })
            .pipe(
                filter(result => result === 'confirm'),
                switchMap(() =>
                    this.reviewService.deleteReview({ type: this.type(), versionId, reviewer: review.reviewer }),
                ),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe({
                next: reviews => {
                    this._reviews.set(reviews);
                    this.logger.info('Review deleted', { versionId, reviewer: review.reviewer });
                },
                error: error => this.logger.error('Failed to delete review', error),
            });
    }
}
