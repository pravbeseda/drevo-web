import { ReviewBadgeComponent } from './review-badge.component';
import { ReviewStatus, ReviewSummary } from '@drevo-web/shared';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';

function createSummary(overrides: Partial<ReviewSummary> = {}): ReviewSummary {
    return {
        versionId: 1,
        status: ReviewStatus.Approve,
        total: 0,
        needsMyVote: false,
        ...overrides,
    };
}

describe('ReviewBadgeComponent', () => {
    let spectator: Spectator<ReviewBadgeComponent>;

    const createComponent = createComponentFactory(ReviewBadgeComponent);

    const getVotePill = () => spectator.query('[data-testid="review-badge-vote"]');
    const getBadge = () => spectator.query('[data-testid="review-badge"]');
    const getLabel = () => spectator.query('[data-testid="review-badge-label"]');
    const getCount = () => spectator.query('[data-testid="review-badge-count"]');

    it('renders the approve verdict with label', () => {
        spectator = createComponent({ props: { summary: createSummary({ status: ReviewStatus.Approve }) } });

        expect(getBadge()).toHaveClass('review-pill--approve');
        expect(getLabel()?.textContent?.trim()).toBe('Одобрено');
    });

    it('renders the suggest verdict with label', () => {
        spectator = createComponent({ props: { summary: createSummary({ status: ReviewStatus.Suggest }) } });

        expect(getBadge()).toHaveClass('review-pill--suggest');
        expect(getLabel()?.textContent?.trim()).toBe('Нужны правки');
    });

    it('renders the disagree verdict with label', () => {
        spectator = createComponent({ props: { summary: createSummary({ status: ReviewStatus.Disagree }) } });

        expect(getBadge()).toHaveClass('review-pill--disagree');
        expect(getLabel()?.textContent?.trim()).toBe('Возражения');
    });

    it('shows the total counter when total > 0', () => {
        spectator = createComponent({ props: { summary: createSummary({ status: ReviewStatus.Approve, total: 5 }) } });

        expect(getCount()?.textContent).toContain('5');
        expect(getCount()?.getAttribute('aria-label')).toBe('Всего проголосовало: 5');
    });

    it('hides the total counter when total is 0', () => {
        spectator = createComponent({ props: { summary: createSummary({ status: ReviewStatus.Approve, total: 0 }) } });

        expect(getCount()).toBeFalsy();
    });

    it('renders the blue "needs my vote" pill regardless of status', () => {
        spectator = createComponent({
            props: { summary: createSummary({ status: ReviewStatus.Disagree, total: 3, needsMyVote: true }) },
        });

        expect(getVotePill()).toBeTruthy();
        expect(getVotePill()).toHaveClass('review-pill--vote');
        expect(getVotePill()?.textContent?.trim()).toBe('Нужен ваш голос');
        expect(getBadge()).toBeFalsy();
    });

    it('renders nothing when there is no verdict and no vote needed', () => {
        spectator = createComponent({
            props: { summary: createSummary({ status: undefined, total: 0, needsMyVote: false }) },
        });

        expect(getVotePill()).toBeFalsy();
        expect(getBadge()).toBeFalsy();
    });
});
