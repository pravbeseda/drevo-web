import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { ArticlesHistoryItemComponent } from './articles-history-item.component';
import { ApprovalStatus, ArticleHistoryItem, ReviewStatus } from '@drevo-web/shared';
import { IconButtonComponent } from '@drevo-web/ui/icon-button';
import { StatusIconComponent } from '@drevo-web/ui/status-icon';
import { provideRouter } from '@angular/router';
import { MatTooltip } from '@angular/material/tooltip';

function createMockItem(overrides: Partial<ArticleHistoryItem> = {}): ArticleHistoryItem {
    return {
        versionId: 1,
        articleId: 100,
        title: 'Test Article',
        author: 'Test Author',
        date: new Date('2025-01-15T14:30:00'),
        approved: 1,
        isNew: false,
        info: '',
        comment: '',
        ...overrides,
    };
}

describe('ArticlesHistoryItemComponent', () => {
    let spectator: Spectator<ArticlesHistoryItemComponent>;

    const createComponent = createComponentFactory({
        component: ArticlesHistoryItemComponent,
        providers: [provideRouter([])],
    });

    const getTitle = () => spectator.query('[data-testid="title"]');
    const getMetaRow = () => spectator.query('[data-testid="meta-row"]');
    const getTime = () => spectator.query('[data-testid="time"]');
    const getAuthor = () => spectator.query('[data-testid="author"]');
    const getAuthorComment = () => spectator.query('[data-testid="author-comment"]');
    const getModeratorComment = () => spectator.query('[data-testid="moderator-comment"]');
    const getOverlay = () => spectator.query('[data-testid="selection-overlay"]');
    const getCompareButton = () => spectator.query('[data-testid="compare-button"]');
    const getSelectionHint = () => spectator.query('[data-testid="selection-hint"]');
    const getInworkMarker = () => spectator.query('[data-testid="inwork-marker"]');
    const getEditSize = () => spectator.query('[data-testid="edit-size"]');
    const getEditSizeAdded = () => spectator.query('[data-testid="edit-size-added"]');
    const getEditSizeRemoved = () => spectator.query('[data-testid="edit-size-removed"]');
    const getEditSizeLength = () => spectator.query('[data-testid="edit-size-length"]');

    it('should create', () => {
        spectator = createComponent({
            props: { item: createMockItem() },
        });
        expect(spectator.component).toBeTruthy();
    });

    describe('meta row', () => {
        it('should render time and author', () => {
            spectator = createComponent({
                props: { item: createMockItem() },
            });
            expect(getMetaRow()).toBeTruthy();
            expect(getTime()).toBeTruthy();
        });
    });

    describe('status icon', () => {
        it('should render status icon with approved status', () => {
            spectator = createComponent({
                props: { item: createMockItem({ approved: 1 }) },
            });
            const statusIcon = spectator.query(StatusIconComponent);
            expect(statusIcon?.status()).toBe(1);
        });

        it('should render status icon with pending status', () => {
            spectator = createComponent({
                props: { item: createMockItem({ approved: 0 }) },
            });
            const statusIcon = spectator.query(StatusIconComponent);
            expect(statusIcon?.status()).toBe(0);
        });

        it('should render status icon with rejected status', () => {
            spectator = createComponent({
                props: { item: createMockItem({ approved: -1 }) },
            });
            const statusIcon = spectator.query(StatusIconComponent);
            expect(statusIcon?.status()).toBe(-1);
        });
    });

    describe('type icon', () => {
        it('should show disabled icon button for new articles', () => {
            spectator = createComponent({
                props: { item: createMockItem({ isNew: true }) },
            });
            const iconButton = spectator.query(IconButtonComponent);
            expect(iconButton).toBeTruthy();
            expect(iconButton?.icon()).toBe('note_add');
            expect(iconButton?.disabled()).toBe(true);
        });

        it('should show diff icon button for edited articles', () => {
            spectator = createComponent({
                props: { item: createMockItem({ isNew: false }) },
            });
            const iconButton = spectator.query(IconButtonComponent);
            expect(iconButton).toBeTruthy();
            expect(iconButton?.icon()).toBe('difference');
        });
    });

    describe('inwork marker', () => {
        it('should show inwork marker when item is being edited', () => {
            spectator = createComponent({
                props: { item: createMockItem(), inwork: true },
            });

            expect(getInworkMarker()).toBeTruthy();
        });

        it('should not show inwork marker by default', () => {
            spectator = createComponent({
                props: { item: createMockItem() },
            });

            expect(getInworkMarker()).toBeFalsy();
        });
    });

    describe('edit size', () => {
        const pendingWithSize = (added: number, removed: number, newPage = false) =>
            createMockItem({ approved: ApprovalStatus.Pending, editSize: { added, removed, newPage } });

        const showToModerator = (item: ArticleHistoryItem) =>
            (spectator = createComponent({ props: { item, canModerate: true } }));
        const getTooltip = () => spectator.query('[data-testid="edit-size"]', { read: MatTooltip })?.message;

        it('shows the characters added and removed by a pending version, grouped the Russian way', () => {
            showToModerator(pendingWithSize(1840, 112));

            expect(getEditSizeAdded()).toHaveExactTrimmedText('+1 840');
            expect(getEditSizeRemoved()).toHaveExactTrimmedText('−112');
            expect(getEditSizeLength()).toBeFalsy();
        });

        it('shows the size of a page with no approved version yet as its character count, without signs', () => {
            showToModerator(pendingWithSize(1840, 0, true));

            expect(getEditSizeLength()).toHaveExactTrimmedText('1 840 симв.');
            expect(getEditSizeAdded()).toBeFalsy();
            expect(getEditSizeRemoved()).toBeFalsy();
        });

        it('says in the tooltip that the count is the length of a new page', () => {
            showToModerator(pendingWithSize(1840, 0, true));

            expect(getTooltip()).toBe('Символов в тексте новой страницы: 1 840');
        });

        it('shows nothing for a new page with no text', () => {
            showToModerator(pendingWithSize(0, 0, true));

            expect(getEditSize()).toBeFalsy();
        });

        it('spells the numbers out in a tooltip', () => {
            showToModerator(pendingWithSize(1840, 112));

            expect(getTooltip()).toBe('Символов добавлено: 1 840, удалено: 112');
        });

        it('leaves out the removed count when the edit removed nothing', () => {
            showToModerator(pendingWithSize(1840, 0));

            expect(getEditSizeAdded()).toHaveExactTrimmedText('+1 840');
            expect(getEditSizeRemoved()).toBeFalsy();
            expect(getTooltip()).toBe('Символов добавлено: 1 840');
        });

        it('leaves out the added count when the edit added nothing', () => {
            showToModerator(pendingWithSize(0, 112));

            expect(getEditSizeAdded()).toBeFalsy();
            expect(getEditSizeRemoved()).toHaveExactTrimmedText('−112');
            expect(getTooltip()).toBe('Символов удалено: 112');
        });

        it('shows nothing for an edit that changed nothing', () => {
            showToModerator(pendingWithSize(0, 0));

            expect(getEditSize()).toBeFalsy();
        });

        it('shows nothing to a user who cannot moderate', () => {
            spectator = createComponent({ props: { item: pendingWithSize(1840, 112) } });

            expect(getEditSize()).toBeFalsy();
        });

        it('hides the size once the version has left moderation', () => {
            showToModerator(
                createMockItem({
                    approved: ApprovalStatus.Approved,
                    editSize: { added: 5, removed: 1, newPage: false },
                }),
            );

            expect(getEditSize()).toBeFalsy();
        });

        it('shows nothing for a pending version the API sent no size for', () => {
            showToModerator(createMockItem({ approved: ApprovalStatus.Pending }));

            expect(getEditSize()).toBeFalsy();
        });
    });

    describe('diffLink', () => {
        it('should compute link to diff page from versionId', () => {
            spectator = createComponent({
                props: {
                    item: createMockItem({ isNew: false, versionId: 42 }),
                },
            });

            expect(spectator.component.diffLink()).toBe('/history/articles/diff/42');
        });

        it('should address the diff and the version of a news item under news', () => {
            spectator = createComponent({
                props: {
                    item: createMockItem({ isNew: false, versionId: 42, articleId: 7 }),
                    kind: 'news',
                },
            });

            expect(spectator.component.diffLink()).toBe('/history/news/diff/42');
            expect(spectator.component.versionLink()).toBe('/news/7/version/42');
        });
    });

    describe('selection', () => {
        it('should not be selectable by default', () => {
            spectator = createComponent({
                props: { item: createMockItem() },
            });
            expect(spectator.component.selectable()).toBe(false);
            expect(spectator.component.selected()).toBe(false);
        });

        it('should emit select on click when selectable', () => {
            const item = createMockItem();
            spectator = createComponent({
                props: { item, selectable: true },
            });
            const selectSpy = jest.fn();
            spectator.output('selectItem').subscribe(selectSpy);

            spectator.click('.history-item');

            expect(selectSpy).toHaveBeenCalledWith(item);
        });

        it('should not emit select on click when not selectable', () => {
            spectator = createComponent({
                props: { item: createMockItem(), selectable: false },
            });
            const selectSpy = jest.fn();
            spectator.output('selectItem').subscribe(selectSpy);

            spectator.click('.history-item');

            expect(selectSpy).not.toHaveBeenCalled();
        });

        it('should apply selected class when selected', () => {
            spectator = createComponent({
                props: { item: createMockItem(), selected: true },
            });
            expect(spectator.query('.history-item--selected')).toBeTruthy();
        });

        it('should apply selectable class when selectable', () => {
            spectator = createComponent({
                props: { item: createMockItem(), selectable: true },
            });
            expect(spectator.query('.history-item--selectable')).toBeTruthy();
        });

        it('should show overlay when selected', () => {
            spectator = createComponent({
                props: { item: createMockItem(), selected: true },
            });
            expect(getOverlay()).toBeTruthy();
        });

        it('should not show overlay when not selected', () => {
            spectator = createComponent({
                props: { item: createMockItem(), selected: false },
            });
            expect(getOverlay()).toBeFalsy();
        });

        it('should show hint in overlay when selected but cannot compare', () => {
            spectator = createComponent({
                props: { item: createMockItem(), selected: true, canCompare: false },
            });
            expect(getSelectionHint()?.textContent).toContain('Выберите ещё одну версию');
            expect(getCompareButton()).toBeFalsy();
        });

        it('should show compare button in overlay when selected and can compare', () => {
            spectator = createComponent({
                props: { item: createMockItem(), selected: true, canCompare: true },
            });
            expect(getCompareButton()).toBeTruthy();
            expect(getSelectionHint()).toBeFalsy();
        });

        it('should emit compare on compare button click', () => {
            spectator = createComponent({
                props: { item: createMockItem(), selected: true, canCompare: true, selectable: true },
            });
            const compareSpy = jest.fn();
            const selectSpy = jest.fn();
            spectator.output('compare').subscribe(compareSpy);
            spectator.output('selectItem').subscribe(selectSpy);

            spectator.click('[data-testid="compare-button"]');

            expect(compareSpy).toHaveBeenCalled();
            expect(selectSpy).not.toHaveBeenCalled();
        });
    });

    describe('author comment', () => {
        it('should display author comment when info is present', () => {
            spectator = createComponent({
                props: {
                    item: createMockItem({ info: 'Added introduction' }),
                },
            });
            expect(getAuthorComment()?.textContent).toContain('Added introduction');
        });

        it('should not display author comment when info is empty', () => {
            spectator = createComponent({
                props: { item: createMockItem({ info: '' }) },
            });
            expect(getAuthorComment()).toBeFalsy();
        });
    });

    describe('moderator comment', () => {
        it('should display moderator comment when comment is present', () => {
            spectator = createComponent({
                props: {
                    item: createMockItem({ comment: 'Needs revision' }),
                },
            });
            expect(getModeratorComment()?.textContent).toContain('Needs revision');
        });

        it('should not display moderator comment when comment is empty', () => {
            spectator = createComponent({
                props: { item: createMockItem({ comment: '' }) },
            });
            expect(getModeratorComment()).toBeFalsy();
        });
    });

    describe('article title link', () => {
        it('should render article title as link to version view', () => {
            spectator = createComponent({
                props: {
                    item: createMockItem({
                        versionId: 42,
                        title: 'My Article',
                    }),
                },
            });
            expect(getTitle()?.textContent?.trim()).toBe('My Article');
            expect(getTitle()?.getAttribute('href')).toBe('/articles/100/version/42');
        });
    });

    describe('review badge', () => {
        const summary = {
            versionId: 1,
            status: ReviewStatus.Approve,
            total: 2,
            needsMyVote: false,
            voters: { [ReviewStatus.Approve]: ['Анна', 'Борис'] },
        };
        const getBadge = () => spectator.query('[data-testid="review-badge"]');
        const getBadgeLink = () => spectator.query('[data-testid="review-badge-link"]');

        it('shows the review badge for a pending version when a summary is provided', () => {
            spectator = createComponent({
                props: { item: createMockItem({ approved: 0 }), reviewSummary: summary },
            });
            expect(getBadge()).toBeTruthy();
        });

        it('hides the review badge when no summary is provided', () => {
            spectator = createComponent({ props: { item: createMockItem({ approved: 0 }) } });
            expect(getBadge()).toBeFalsy();
        });

        it.each([
            { label: 'approved', approved: ApprovalStatus.Approved },
            { label: 'rejected', approved: ApprovalStatus.Rejected },
            { label: 'cancelled', approved: ApprovalStatus.Cancelled },
        ])('hides the review badge for a $label version even when a summary is provided', ({ approved }) => {
            spectator = createComponent({
                props: { item: createMockItem({ approved }), reviewSummary: summary },
            });
            expect(getBadge()).toBeFalsy();
        });

        it('links the badge to the version diff for edited versions', () => {
            spectator = createComponent({
                props: { item: createMockItem({ approved: 0, isNew: false, versionId: 42 }), reviewSummary: summary },
            });
            expect(getBadgeLink()?.getAttribute('href')).toBe('/history/articles/diff/42');
        });

        it('links the badge to the version page for new versions', () => {
            spectator = createComponent({
                props: {
                    item: createMockItem({ approved: 0, isNew: true, articleId: 100, versionId: 42 }),
                    reviewSummary: summary,
                },
            });
            expect(getBadgeLink()?.getAttribute('href')).toBe('/articles/100/version/42');
        });
    });

    describe('moderation', () => {
        const getModerateButton = () => spectator.query('[data-testid="moderate-button"]');

        it('should not offer moderation by default', () => {
            spectator = createComponent({ props: { item: createMockItem({ approved: ApprovalStatus.Pending }) } });
            expect(getModerateButton()).toBeFalsy();
            expect(spectator.query(StatusIconComponent)).toBeTruthy();
        });

        it.each([ApprovalStatus.Pending, ApprovalStatus.Approved, ApprovalStatus.Rejected])(
            'should turn the status icon %s into a moderation button for a moderator',
            approved => {
                spectator = createComponent({ props: { item: createMockItem({ approved }), canModerate: true } });
                expect(getModerateButton()?.getAttribute('aria-label')).toBe('Модерация');
                expect(spectator.query('[data-testid="moderate-button"] [data-testid="status-icon"]')).toBeTruthy();
            },
        );

        it('should not offer moderation of a version cancelled by its author', () => {
            spectator = createComponent({
                props: { item: createMockItem({ approved: ApprovalStatus.Cancelled }), canModerate: true },
            });
            expect(getModerateButton()).toBeFalsy();
        });

        it('should emit moderate with the item on click, without selecting it', () => {
            const item = createMockItem({ approved: ApprovalStatus.Pending });
            spectator = createComponent({ props: { item, canModerate: true, selectable: true } });
            const moderateSpy = jest.fn();
            const selectSpy = jest.fn();
            spectator.output('moderate').subscribe(moderateSpy);
            spectator.output('selectItem').subscribe(selectSpy);

            spectator.click('[data-testid="moderate-button"]');

            expect(moderateSpy).toHaveBeenCalledWith(item);
            expect(selectSpy).not.toHaveBeenCalled();
        });

        it.each(['Enter', ' '])('should not select the item when %p is pressed on the button', key => {
            spectator = createComponent({
                props: {
                    item: createMockItem({ approved: ApprovalStatus.Pending }),
                    canModerate: true,
                    selectable: true,
                },
            });
            const selectSpy = jest.fn();
            spectator.output('selectItem').subscribe(selectSpy);

            spectator.dispatchKeyboardEvent('[data-testid="moderate-button"]', 'keydown', key);

            expect(selectSpy).not.toHaveBeenCalled();
        });
    });

    describe('author display', () => {
        it('should display author name', () => {
            spectator = createComponent({
                props: { item: createMockItem({ author: 'Иванов А.' }) },
            });
            expect(getAuthor()?.textContent?.trim()).toBe('Иванов А.');
        });
    });
});
