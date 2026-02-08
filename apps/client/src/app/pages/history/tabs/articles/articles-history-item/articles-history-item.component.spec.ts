import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { ArticlesHistoryItemComponent } from './articles-history-item.component';
import { ArticleHistoryItem } from '@drevo-web/shared';
import { IconButtonComponent } from '@drevo-web/ui';
import { provideRouter } from '@angular/router';

function createMockItem(
    overrides: Partial<ArticleHistoryItem> = {}
): ArticleHistoryItem {
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
    const getAuthorComment = () =>
        spectator.query('[data-testid="author-comment"]');
    const getModeratorComment = () =>
        spectator.query('[data-testid="moderator-comment"]');

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

    describe('status icon mapping', () => {
        it('should show check_circle for approved items', () => {
            spectator = createComponent({
                props: { item: createMockItem({ approved: 1 }) },
            });
            expect(spectator.component.statusIcon()).toBe('check_circle');
            expect(spectator.component.statusTitle()).toBe('Одобрено');
        });

        it('should show schedule for pending items', () => {
            spectator = createComponent({
                props: { item: createMockItem({ approved: 0 }) },
            });
            expect(spectator.component.statusIcon()).toBe('schedule');
            expect(spectator.component.statusTitle()).toBe('На проверке');
        });

        it('should show cancel for rejected items', () => {
            spectator = createComponent({
                props: { item: createMockItem({ approved: -1 }) },
            });
            expect(spectator.component.statusIcon()).toBe('cancel');
            expect(spectator.component.statusTitle()).toBe('Отклонено');
        });
    });

    describe('approval class', () => {
        it('should return approved for approved items', () => {
            spectator = createComponent({
                props: { item: createMockItem({ approved: 1 }) },
            });
            expect(spectator.component.approvalClass()).toBe('approved');
        });

        it('should return pending for pending items', () => {
            spectator = createComponent({
                props: { item: createMockItem({ approved: 0 }) },
            });
            expect(spectator.component.approvalClass()).toBe('pending');
        });

        it('should return rejected for rejected items', () => {
            spectator = createComponent({
                props: { item: createMockItem({ approved: -1 }) },
            });
            expect(spectator.component.approvalClass()).toBe('rejected');
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

    describe('viewDiff output', () => {
        it('should emit versionId when diff button is clicked', () => {
            spectator = createComponent({
                props: {
                    item: createMockItem({ isNew: false, versionId: 42 }),
                },
            });
            const spy = jest.spyOn(spectator.component.viewDiff, 'emit');

            spectator.component.onViewDiff();

            expect(spy).toHaveBeenCalledWith(42);
        });

    });

    describe('author comment', () => {
        it('should display author comment when info is present', () => {
            spectator = createComponent({
                props: {
                    item: createMockItem({ info: 'Added introduction' }),
                },
            });
            expect(getAuthorComment()?.textContent).toContain(
                'Added introduction'
            );
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
            expect(getModeratorComment()?.textContent).toContain(
                'Needs revision'
            );
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
            expect(getTitle()?.getAttribute('href')).toBe(
                '/articles/version/42'
            );
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
