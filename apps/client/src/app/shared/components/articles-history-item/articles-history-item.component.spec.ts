import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { ArticlesHistoryItemComponent } from './articles-history-item.component';
import { ArticleHistoryItem } from '@drevo-web/shared';
import { IconButtonComponent, StatusIconComponent } from '@drevo-web/ui';
import { provideRouter } from '@angular/router';

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

    describe('diffLink', () => {
        it('should compute link to diff page from versionId', () => {
            spectator = createComponent({
                props: {
                    item: createMockItem({ isNew: false, versionId: 42 }),
                },
            });

            expect(spectator.component.diffLink()).toEqual(['/history/articles/diff', 42]);
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

    describe('author display', () => {
        it('should display author name', () => {
            spectator = createComponent({
                props: { item: createMockItem({ author: 'Иванов А.' }) },
            });
            expect(getAuthor()?.textContent?.trim()).toBe('Иванов А.');
        });
    });
});
