import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { ArticlesHistoryItemComponent } from './articles-history-item.component';
import { ArticleHistoryItem } from '@drevo-web/shared';
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

    it('should create', () => {
        spectator = createComponent({
            props: { item: createMockItem() },
        });
        expect(spectator.component).toBeTruthy();
    });

    describe('time separator', () => {
        it('should render time separator', () => {
            spectator = createComponent({
                props: { item: createMockItem() },
            });
            expect(spectator.query('.time-sep')).toBeTruthy();
            expect(spectator.query('.time-text')).toBeTruthy();
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

    describe('right border class', () => {
        it('should apply approved class to history item', () => {
            spectator = createComponent({
                props: { item: createMockItem({ approved: 1 }) },
            });
            expect(spectator.query('.hi--approved')).toBeTruthy();
        });

        it('should apply pending class to history item', () => {
            spectator = createComponent({
                props: { item: createMockItem({ approved: 0 }) },
            });
            expect(spectator.query('.hi--pending')).toBeTruthy();
        });

        it('should apply rejected class to history item', () => {
            spectator = createComponent({
                props: { item: createMockItem({ approved: -1 }) },
            });
            expect(spectator.query('.hi--rejected')).toBeTruthy();
        });
    });

    describe('type icon', () => {
        it('should show note_add icon for new articles', () => {
            spectator = createComponent({
                props: { item: createMockItem({ isNew: true }) },
            });
            expect(spectator.query('.type-icon')).toBeTruthy();
            expect(spectator.query('.diff-btn')).toBeFalsy();
        });

        it('should show diff button for edited articles', () => {
            spectator = createComponent({
                props: { item: createMockItem({ isNew: false }) },
            });
            expect(spectator.query('.diff-btn')).toBeTruthy();
            expect(spectator.query('.type-icon')).toBeFalsy();
        });
    });

    describe('author comment', () => {
        it('should display author comment when info is present', () => {
            spectator = createComponent({
                props: {
                    item: createMockItem({ info: 'Added introduction' }),
                },
            });
            const comment = spectator.query('.author-comment');
            expect(comment).toBeTruthy();
            expect(comment?.textContent).toContain('Added introduction');
        });

        it('should not display author comment when info is empty', () => {
            spectator = createComponent({
                props: { item: createMockItem({ info: '' }) },
            });
            expect(spectator.query('.author-comment')).toBeFalsy();
        });
    });

    describe('moderator comment', () => {
        it('should display moderator comment when comment is present', () => {
            spectator = createComponent({
                props: {
                    item: createMockItem({ comment: 'Needs revision' }),
                },
            });
            const comment = spectator.query('.moderator-comment');
            expect(comment).toBeTruthy();
            expect(comment?.textContent).toContain('Needs revision');
        });

        it('should not display moderator comment when comment is empty', () => {
            spectator = createComponent({
                props: { item: createMockItem({ comment: '' }) },
            });
            expect(spectator.query('.moderator-comment')).toBeFalsy();
        });
    });

    describe('article title link', () => {
        it('should render article title as link', () => {
            spectator = createComponent({
                props: {
                    item: createMockItem({
                        articleId: 42,
                        title: 'My Article',
                    }),
                },
            });
            const link = spectator.query('.hi-title');
            expect(link).toBeTruthy();
            expect(link?.textContent?.trim()).toBe('My Article');
            expect(link?.getAttribute('href')).toBe('/articles/42');
        });
    });

    describe('author display', () => {
        it('should display author name', () => {
            spectator = createComponent({
                props: { item: createMockItem({ author: 'Иванов А.' }) },
            });
            const author = spectator.query('.hi-author');
            expect(author?.textContent?.trim()).toBe('Иванов А.');
        });
    });
});
