import { ReviewBadgeComponent } from './review-badge.component';
import { MatTooltip } from '@angular/material/tooltip';
import { ReviewStatus, ReviewSummary } from '@drevo-web/shared';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';

function createSummary(overrides: Partial<ReviewSummary> = {}): ReviewSummary {
    return {
        versionId: 1,
        needsMyVote: false,
        voters: {},
        ...overrides,
    };
}

describe('ReviewBadgeComponent', () => {
    let spectator: Spectator<ReviewBadgeComponent>;

    const createComponent = createComponentFactory(ReviewBadgeComponent);

    const getBadge = () => spectator.query('[data-testid="review-badge"]');
    const getChips = () => spectator.queryAll('[data-testid="review-badge-chip"]');
    const getChipTexts = () =>
        spectator.queryAll('[data-testid="review-badge-chip-text"]').map(text => text.textContent?.trim());
    const getVotePill = () => spectator.query('[data-testid="review-badge-vote"]');
    const getChipTooltips = () =>
        spectator.queryAll('[data-testid="review-badge-chip"]', { read: MatTooltip }).map(tooltip => tooltip.message);
    const getChipTooltipClasses = () =>
        spectator
            .queryAll('[data-testid="review-badge-chip"]', { read: MatTooltip })
            .map(tooltip => tooltip.tooltipClass);

    it('renders one chip per verdict with votes, approve → suggest → disagree, with counts', () => {
        spectator = createComponent({
            props: {
                summary: createSummary({
                    voters: { [ReviewStatus.Disagree]: ['Вера'], [ReviewStatus.Approve]: ['Анна', 'Борис'] },
                }),
            },
        });

        expect(getChipTexts()).toEqual(['2', '1']);
        expect(getChips()[0]).toHaveClass('review-chip--success');
        expect(getChips()[1]).toHaveClass('review-chip--error');
    });

    it('reads "Вы" on the chip holding the only vote of the viewer', () => {
        spectator = createComponent({
            props: {
                summary: createSummary({ voters: { [ReviewStatus.Suggest]: ['Иван'] }, myVote: ReviewStatus.Suggest }),
            },
        });

        expect(getChipTexts()).toEqual(['Вы']);
    });

    it('reads "Вы +N" on the chip holding the viewer vote among others', () => {
        spectator = createComponent({
            props: {
                summary: createSummary({
                    voters: { [ReviewStatus.Approve]: ['Анна', 'Иван', 'Борис'], [ReviewStatus.Disagree]: ['Вера'] },
                    myVote: ReviewStatus.Approve,
                }),
            },
        });

        expect(getChipTexts()).toEqual(['Вы +2', '1']);
    });

    it('renders the "Нужен ваш голос" pill after the chips', () => {
        spectator = createComponent({
            props: {
                summary: createSummary({ voters: { [ReviewStatus.Disagree]: ['Вера'] }, needsMyVote: true }),
            },
        });

        expect(getChipTexts()).toEqual(['1']);
        expect(getVotePill()?.textContent?.trim()).toBe('Нужен ваш голос');
        expect(getBadge()?.lastElementChild).toBe(getVotePill());
    });

    it('renders only the vote pill when nobody has voted yet', () => {
        spectator = createComponent({ props: { summary: createSummary({ needsMyVote: true }) } });

        expect(getChips()).toHaveLength(0);
        expect(getVotePill()).toBeTruthy();
    });

    it('names its verdict and only that verdict voters in each chip tooltip, one voter per line', () => {
        spectator = createComponent({
            props: {
                summary: createSummary({
                    voters: { [ReviewStatus.Approve]: ['Анна', 'Борис'], [ReviewStatus.Disagree]: ['Вера'] },
                }),
            },
        });

        expect(getChipTooltips()).toEqual(['Одобряю:\nАнна\nБорис', 'Возражаю:\nВера']);
    });

    it('marks each chip tooltip as multiline so the line breaks survive', () => {
        spectator = createComponent({
            props: {
                summary: createSummary({ voters: { [ReviewStatus.Approve]: ['Анна'] } }),
            },
        });

        expect(getChipTooltipClasses()).toEqual(['multiline-tooltip']);
    });

    it('renders nothing when there are no votes and no vote is needed', () => {
        spectator = createComponent({ props: { summary: createSummary() } });

        expect(getBadge()).toBeFalsy();
    });
});
