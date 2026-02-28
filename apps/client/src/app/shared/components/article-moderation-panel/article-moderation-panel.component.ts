import { ArticleService } from '../../../services/articles/article.service';
import { VersionForModeration } from '../../models/version-for-moderation.model';
import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    computed,
    effect,
    inject,
    input,
    output,
    signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoggerService, NotificationService } from '@drevo-web/core';
import { APPROVAL_CLASS, APPROVAL_TITLES, ApprovalStatus, ModerationResult } from '@drevo-web/shared';
import { ButtonComponent, FormatDatePipe, StatusIconComponent, TextInputComponent } from '@drevo-web/ui';

@Component({
    selector: 'app-article-moderation-panel',
    imports: [ButtonComponent, StatusIconComponent, TextInputComponent, FormatDatePipe],
    templateUrl: './article-moderation-panel.component.html',
    styleUrl: './article-moderation-panel.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleModerationPanelComponent {
    private readonly articleService = inject(ArticleService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly logger = inject(LoggerService).withContext('ArticleModerationPanelComponent');
    private readonly notification = inject(NotificationService);

    readonly version = input.required<VersionForModeration>();
    readonly moderated = output<ModerationResult>();

    readonly statusText = computed(() => {
        const status = this.version().approved;
        return APPROVAL_TITLES[APPROVAL_CLASS[status]];
    });

    private readonly _comment = signal('');
    readonly comment = this._comment.asReadonly();

    constructor() {
        effect(() => this._comment.set(this.version().comment ?? ''));
    }

    private readonly _isLoading = signal(false);
    readonly isLoading = this._isLoading.asReadonly();

    readonly isApproved = computed(() => this.version().approved === ApprovalStatus.Approved);
    readonly isPending = computed(() => this.version().approved === ApprovalStatus.Pending);
    readonly isRejected = computed(() => this.version().approved === ApprovalStatus.Rejected);

    onCommentChange(value: string): void {
        this._comment.set(value);
    }

    approve(): void {
        this.moderate(ApprovalStatus.Approved, 'Версия одобрена');
    }

    sendToReview(): void {
        this.moderate(ApprovalStatus.Pending, 'Версия отправлена на проверку');
    }

    reject(): void {
        this.moderate(ApprovalStatus.Rejected, 'Версия отклонена');
    }

    private moderate(approved: ApprovalStatus, successMessage: string): void {
        const versionId = this.version().versionId;
        const comment = this._comment() ?? '';

        this._isLoading.set(true);
        this.logger.info('Moderation: submitting', { versionId, approved, comment });

        this.articleService
            .moderateVersion(versionId, approved, comment)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: result => {
                    this._isLoading.set(false);
                    this.notification.success(successMessage);
                    this.logger.info('Moderation: success', { versionId, approved });
                    this.moderated.emit(result);
                },
                error: err => {
                    this._isLoading.set(false);
                    this.notification.error('Не удалось выполнить модерацию');
                    this.logger.error('Moderation: failed', err);
                },
            });
    }
}
