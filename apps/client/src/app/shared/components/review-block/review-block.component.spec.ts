import { ReviewBlockComponent } from './review-block.component';
import { AuthService } from '../../../services/auth/auth.service';
import { ReviewService } from '../../../services/reviews/review.service';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { ApprovalStatus, Review, ReviewStatus, User } from '@drevo-web/shared';
import { createMockUser } from '@drevo-web/shared/testing';
import { ConfirmationService } from '@drevo-web/ui';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { BehaviorSubject, of } from 'rxjs';

const AUTHOR = 'Article Author';
const VERSION_ID = 42;

function review(overrides: Partial<Review> = {}): Review {
    return {
        reviewer: 'Reviewer One',
        status: ReviewStatus.Suggest,
        comment: 'Please fix this',
        updatedAt: new Date('2025-01-15T10:00:00Z'),
        ...overrides,
    };
}

describe('ReviewBlockComponent', () => {
    let spectator: Spectator<ReviewBlockComponent>;

    const user$ = new BehaviorSubject<User | undefined>(undefined);
    const getReviews = jest.fn();
    const setReview = jest.fn();
    const deleteReview = jest.fn();
    const confirmOpen = jest.fn();

    const createComponent = createComponentFactory({
        component: ReviewBlockComponent,
        providers: [
            mockLoggerProvider(),
            { provide: AuthService, useValue: { user$ } },
            { provide: ReviewService, useValue: { getReviews, setReview, deleteReview } },
            { provide: ConfirmationService, useValue: { open: confirmOpen } },
        ],
    });

    beforeEach(() => {
        jest.clearAllMocks();
        user$.next(undefined);
        getReviews.mockReturnValue(of([]));
        setReview.mockReturnValue(of([]));
        deleteReview.mockReturnValue(of([]));
        confirmOpen.mockReturnValue(of('confirm'));
    });

    function render(props: { approved?: ApprovalStatus; author?: string } = {}): void {
        spectator = createComponent({
            props: {
                versionId: VERSION_ID,
                author: props.author ?? AUTHOR,
                approved: props.approved ?? ApprovalStatus.Pending,
                type: 'article',
            },
        });
        spectator.detectChanges();
    }

    it('hides the block when there are no reviews and the user cannot review', () => {
        user$.next(createMockUser({ isReviewer: false }));
        render({ approved: ApprovalStatus.Approved });

        expect(spectator.query('[data-testid="review-block"]')).toBeNull();
    });

    it('shows a read-only list when reviews exist but the user cannot review', () => {
        getReviews.mockReturnValue(of([review()]));
        user$.next(createMockUser({ isReviewer: false }));
        render({ approved: ApprovalStatus.Approved });

        expect(spectator.query('[data-testid="review-block"]')).not.toBeNull();
        expect(spectator.query('[data-testid="review-comment"]')).not.toBeNull();
        expect(spectator.query('[data-testid="review-form"]')).toBeNull();
    });

    it('shows the vote form when the user can review a pending version', () => {
        user$.next(createMockUser({ isReviewer: true }));
        render({ approved: ApprovalStatus.Pending });

        expect(spectator.query('[data-testid="review-form"]')).not.toBeNull();
        expect(spectator.component.canReview()).toBe(true);
    });

    it('hides the "Одобряю" pill on the author\'s own version', () => {
        user$.next(createMockUser({ name: AUTHOR, isReviewer: true }));
        render({ approved: ApprovalStatus.Pending, author: AUTHOR });

        const labels = spectator
            .queryAll('[data-testid="review-status"] .toggle-label')
            .map(el => el.textContent?.trim());
        expect(labels.length).toBeGreaterThan(0);
        expect(labels).not.toContain('Одобряю');
        expect(spectator.component.isOwnVersion()).toBe(true);
    });

    describe('pill tones', () => {
        function toneClassOf(status: ReviewStatus): string | undefined {
            const icon = spectator.query(`[data-testid="toggle-${status}"] ui-icon`);
            return Array.from(icon?.classList ?? []).find(cssClass => cssClass.startsWith('tone-'));
        }

        it('paints the selected "Нет решения" pill with the accent tone and the rest neutral', () => {
            user$.next(createMockUser({ isReviewer: true }));
            render({ approved: ApprovalStatus.Pending });

            expect(toneClassOf(ReviewStatus.Undecided)).toBe('tone-accent');
            expect(toneClassOf(ReviewStatus.Approve)).toBe('tone-neutral');
            expect(toneClassOf(ReviewStatus.Suggest)).toBe('tone-neutral');
        });

        it('moves the verdict tone onto the newly selected pill', () => {
            user$.next(createMockUser({ isReviewer: true }));
            render({ approved: ApprovalStatus.Pending });

            spectator.component.form.controls.status.setValue(ReviewStatus.Approve);
            spectator.detectChanges();

            expect(toneClassOf(ReviewStatus.Approve)).toBe('tone-success');
            expect(toneClassOf(ReviewStatus.Undecided)).toBe('tone-neutral');
        });
    });

    it('requires a comment for Suggest/Disagree but not for Approve', () => {
        user$.next(createMockUser({ isReviewer: true }));
        render({ approved: ApprovalStatus.Pending });

        spectator.component.form.setValue({ status: ReviewStatus.Suggest, comment: '' });
        spectator.component.form.markAsDirty();
        expect(spectator.component.canSave()).toBe(false);

        spectator.component.form.controls.comment.setValue('Needs work');
        expect(spectator.component.canSave()).toBe(true);

        spectator.component.form.setValue({ status: ReviewStatus.Approve, comment: '' });
        expect(spectator.component.canSave()).toBe(true);
    });

    it('submits the vote via ReviewService.setReview', () => {
        user$.next(createMockUser({ isReviewer: true }));
        render({ approved: ApprovalStatus.Pending });

        spectator.component.form.setValue({ status: ReviewStatus.Approve, comment: ' ok ' });
        spectator.component.form.markAsDirty();
        spectator.component.submit();

        expect(setReview).toHaveBeenCalledWith({
            type: 'article',
            versionId: VERSION_ID,
            status: ReviewStatus.Approve,
            comment: 'ok',
        });
    });

    it('deletes a review through confirmation and ReviewService.deleteReview', () => {
        const target = review({ reviewer: 'Reviewer One' });
        getReviews.mockReturnValue(of([target]));
        user$.next(createMockUser({ permissions: { canModerate: true }, isReviewer: false }));
        render({ approved: ApprovalStatus.Approved });

        spectator.component.deleteReview(target);

        expect(confirmOpen).toHaveBeenCalled();
        expect(deleteReview).toHaveBeenCalledWith({
            type: 'article',
            versionId: VERSION_ID,
            reviewer: 'Reviewer One',
        });
    });

    it('does not delete when confirmation is dismissed', () => {
        confirmOpen.mockReturnValue(of('cancel'));
        const target = review();
        getReviews.mockReturnValue(of([target]));
        user$.next(createMockUser({ permissions: { canModerate: true } }));
        render({ approved: ApprovalStatus.Approved });

        spectator.component.deleteReview(target);

        expect(deleteReview).not.toHaveBeenCalled();
    });

    describe('canDelete', () => {
        it('allows a moderator to delete any review', () => {
            user$.next(createMockUser({ name: 'Mod', permissions: { canModerate: true } }));
            render({ approved: ApprovalStatus.Approved });

            expect(spectator.component.canDelete(review({ reviewer: 'Someone' }))).toBe(true);
        });

        it('allows self-delete only on a pending version', () => {
            user$.next(createMockUser({ name: 'Me', isReviewer: true }));
            render({ approved: ApprovalStatus.Pending });

            expect(spectator.component.canDelete(review({ reviewer: 'Me' }))).toBe(true);
            expect(spectator.component.canDelete(review({ reviewer: 'Other' }))).toBe(false);
        });
    });

    it('clears the comment and reflects clearability via canClear', () => {
        user$.next(createMockUser({ isReviewer: true }));
        render({ approved: ApprovalStatus.Pending });

        spectator.component.form.controls.comment.setValue('something');
        expect(spectator.component.canClear()).toBe(true);

        spectator.component.clearComment();

        expect(spectator.component.form.controls.comment.value).toBe('');
        expect(spectator.component.canClear()).toBe(false);
    });

    it('renders a comment URL as a safe external link', () => {
        getReviews.mockReturnValue(of([review({ comment: 'см. https://example.com' })]));
        user$.next(createMockUser({ isReviewer: false }));
        render({ approved: ApprovalStatus.Approved });

        const link = spectator.query('[data-testid="review-comment"] a');
        expect(link).not.toBeNull();
        expect(link?.getAttribute('href')).toBe('https://example.com');
        expect(link?.getAttribute('target')).toBe('_blank');
        expect(link?.getAttribute('rel')).toBe('noopener noreferrer nofollow');
    });
});
