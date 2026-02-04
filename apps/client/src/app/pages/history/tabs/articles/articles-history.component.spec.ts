import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { ArticlesHistoryComponent } from './articles-history.component';
import { ArticleService } from '../../../../services/articles/article.service';
import { AuthService } from '../../../../services/auth/auth.service';
import { mockLoggerProvider, MockLoggerService } from '@drevo-web/core/testing';
import { LoggerService } from '@drevo-web/core';
import {
    ArticleHistoryItem,
    ArticleHistoryResponse,
    User,
} from '@drevo-web/shared';
import { BehaviorSubject, NEVER, of, throwError } from 'rxjs';

const mockUser: User = {
    id: 1,
    login: 'testuser',
    name: 'Test User',
    email: 'test@example.com',
    role: 'user',
    permissions: { canEdit: true, canModerate: false, canAdmin: false },
};

function createMockHistoryItem(
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

function createMockResponse(
    items: readonly ArticleHistoryItem[] = [],
    total = 0
): ArticleHistoryResponse {
    return {
        items,
        total,
        page: 1,
        pageSize: 25,
        totalPages: Math.ceil(total / 25),
    };
}

describe('ArticlesHistoryComponent', () => {
    let spectator: Spectator<ArticlesHistoryComponent>;
    let articleService: jest.Mocked<ArticleService>;
    let userSubject: BehaviorSubject<User | undefined>;

    const createComponent = createComponentFactory({
        component: ArticlesHistoryComponent,
        mocks: [ArticleService],
        providers: [
            mockLoggerProvider(),
            {
                provide: AuthService,
                useFactory: () => {
                    userSubject = new BehaviorSubject<User | undefined>(
                        mockUser
                    );
                    return {
                        user$: userSubject.asObservable(),
                        get currentUser() {
                            return userSubject.value;
                        },
                        isAuthenticated$: of(true),
                        isLoading$: of(false),
                    };
                },
            },
        ],
        detectChanges: false,
    });

    beforeEach(() => {
        spectator = createComponent();
        articleService = spectator.inject(
            ArticleService
        ) as jest.Mocked<ArticleService>;
    });

    it('should create', () => {
        articleService.getArticlesHistory.mockReturnValue(
            of(createMockResponse())
        );
        spectator.detectChanges();
        expect(spectator.component).toBeTruthy();
    });

    describe('initial loading', () => {
        it('should show spinner while loading', () => {
            articleService.getArticlesHistory.mockReturnValue(NEVER);
            spectator.detectChanges();
            expect(spectator.query('ui-spinner')).toBeTruthy();
        });

        it('should load history on init', () => {
            articleService.getArticlesHistory.mockReturnValue(
                of(createMockResponse())
            );
            spectator.detectChanges();
            expect(articleService.getArticlesHistory).toHaveBeenCalledWith({
                page: 1,
            });
        });

        it('should display items after loading', () => {
            const items = [
                createMockHistoryItem({ versionId: 1, title: 'Article One' }),
                createMockHistoryItem({ versionId: 2, title: 'Article Two' }),
            ];
            articleService.getArticlesHistory.mockReturnValue(
                of(createMockResponse(items, 2))
            );
            spectator.detectChanges();

            expect(spectator.component.hasItems()).toBe(true);
            expect(spectator.component.isLoading()).toBe(false);
        });

        it('should show empty message when no items', () => {
            articleService.getArticlesHistory.mockReturnValue(
                of(createMockResponse())
            );
            spectator.detectChanges();

            expect(spectator.query('.history-empty')).toBeTruthy();
        });
    });

    describe('date grouping', () => {
        it('should insert date headers between groups', () => {
            const items = [
                createMockHistoryItem({
                    versionId: 1,
                    date: new Date('2025-01-15T14:30:00'),
                }),
                createMockHistoryItem({
                    versionId: 2,
                    date: new Date('2025-01-15T10:00:00'),
                }),
                createMockHistoryItem({
                    versionId: 3,
                    date: new Date('2025-01-14T09:00:00'),
                }),
            ];
            articleService.getArticlesHistory.mockReturnValue(
                of(createMockResponse(items, 3))
            );
            spectator.detectChanges();

            const displayItems = spectator.component.displayItems();
            // Should have 2 headers + 3 version items = 5 total
            expect(displayItems.length).toBe(5);
            expect(displayItems[0].type).toBe('header');
            expect(displayItems[1].type).toBe('version');
            expect(displayItems[2].type).toBe('version');
            expect(displayItems[3].type).toBe('header');
            expect(displayItems[4].type).toBe('version');
        });

        it('should not add duplicate headers for same date', () => {
            const items = [
                createMockHistoryItem({
                    versionId: 1,
                    date: new Date('2025-01-15T14:30:00'),
                }),
                createMockHistoryItem({
                    versionId: 2,
                    date: new Date('2025-01-15T10:00:00'),
                }),
            ];
            articleService.getArticlesHistory.mockReturnValue(
                of(createMockResponse(items, 2))
            );
            spectator.detectChanges();

            const displayItems = spectator.component.displayItems();
            const headers = displayItems.filter(i => i.type === 'header');
            expect(headers.length).toBe(1);
        });
    });

    describe('display items', () => {
        it('should include approval class in version items', () => {
            const items = [
                createMockHistoryItem({
                    versionId: 1,
                    approved: 1,
                    date: new Date('2025-01-15T14:00:00'),
                }),
                createMockHistoryItem({
                    versionId: 2,
                    approved: -1,
                    date: new Date('2025-01-15T13:00:00'),
                }),
                createMockHistoryItem({
                    versionId: 3,
                    approved: 0,
                    date: new Date('2025-01-15T12:00:00'),
                }),
            ];
            articleService.getArticlesHistory.mockReturnValue(
                of(createMockResponse(items, 3))
            );
            spectator.detectChanges();

            const displayItems = spectator.component.displayItems();
            const versionItems = displayItems.filter(
                i => i.type === 'version'
            );

            expect(versionItems[0]).toMatchObject({
                data: expect.objectContaining({ approved: 1 }),
            });
            expect(versionItems[1]).toMatchObject({
                data: expect.objectContaining({ approved: -1 }),
            });
            expect(versionItems[2]).toMatchObject({
                data: expect.objectContaining({ approved: 0 }),
            });
        });

        it('should include date in version items for pipe formatting', () => {
            const testDate = new Date('2025-01-15T14:30:00');
            const items = [
                createMockHistoryItem({
                    versionId: 1,
                    date: testDate,
                }),
            ];
            articleService.getArticlesHistory.mockReturnValue(
                of(createMockResponse(items, 1))
            );
            spectator.detectChanges();

            const displayItems = spectator.component.displayItems();
            const versionItem = displayItems.find(i => i.type === 'version');

            expect(versionItem).toMatchObject({
                type: 'version',
                data: expect.objectContaining({ date: testDate }),
            });
        });
    });

    describe('canFilterByAuthor', () => {
        it('should be true when user is available', () => {
            articleService.getArticlesHistory.mockReturnValue(
                of(createMockResponse())
            );
            spectator.detectChanges();

            expect(spectator.component.canFilterByAuthor()).toBe(true);
        });

        it('should be false when user is undefined', () => {
            userSubject.next(undefined);
            articleService.getArticlesHistory.mockReturnValue(
                of(createMockResponse())
            );
            spectator.detectChanges();

            expect(spectator.component.canFilterByAuthor()).toBe(false);
        });

        it('should hide "my" button when user is not available', () => {
            userSubject.next(undefined);
            articleService.getArticlesHistory.mockReturnValue(
                of(createMockResponse())
            );
            spectator.detectChanges();

            const buttons = spectator.queryAll('ui-button');
            const buttonTexts = buttons.map(b =>
                b.textContent?.trim()
            );
            expect(buttonTexts).not.toContain('Мои');
        });

        it('should show "my" button when user is available', () => {
            articleService.getArticlesHistory.mockReturnValue(
                of(createMockResponse())
            );
            spectator.detectChanges();

            const buttons = spectator.queryAll('ui-button');
            const buttonTexts = buttons.map(b =>
                b.textContent?.trim()
            );
            expect(buttonTexts).toContain('Мои');
        });
    });

    describe('filters', () => {
        beforeEach(() => {
            articleService.getArticlesHistory.mockReturnValue(
                of(createMockResponse())
            );
            spectator.detectChanges();
        });

        it('should default to "all" filter', () => {
            expect(spectator.component.activeFilter()).toBe('all');
        });

        it('should reload with approved=0 when unchecked filter selected', () => {
            articleService.getArticlesHistory.mockClear();
            articleService.getArticlesHistory.mockReturnValue(
                of(createMockResponse())
            );

            spectator.component.onFilterChange('unchecked');
            spectator.detectChanges();

            expect(articleService.getArticlesHistory).toHaveBeenCalledWith({
                page: 1,
                approved: 0,
            });
        });

        it('should reload with author when "my" filter selected', () => {
            articleService.getArticlesHistory.mockClear();
            articleService.getArticlesHistory.mockReturnValue(
                of(createMockResponse())
            );

            spectator.component.onFilterChange('my');
            spectator.detectChanges();

            expect(articleService.getArticlesHistory).toHaveBeenCalledWith({
                page: 1,
                author: 'testuser',
            });
        });

        it('should not reload when selecting same filter', () => {
            articleService.getArticlesHistory.mockClear();

            spectator.component.onFilterChange('all');

            expect(articleService.getArticlesHistory).not.toHaveBeenCalled();
        });

        it('should not load when "my" filter selected and user not available', () => {
            userSubject.next(undefined);
            spectator.detectChanges();

            articleService.getArticlesHistory.mockClear();
            spectator.component.onFilterChange('my');
            spectator.detectChanges();

            expect(articleService.getArticlesHistory).not.toHaveBeenCalled();
        });

        it('should reset items and error state when changing filter', () => {
            articleService.getArticlesHistory.mockReturnValue(
                throwError(() => new Error('fail'))
            );
            spectator.component.onFilterChange('unchecked');
            spectator.detectChanges();

            expect(spectator.component.hasError()).toBe(true);

            articleService.getArticlesHistory.mockReturnValue(
                of(createMockResponse([createMockHistoryItem()], 1))
            );
            spectator.component.onFilterChange('all');
            spectator.detectChanges();

            expect(spectator.component.hasError()).toBe(false);
            expect(spectator.component.activeFilter()).toBe('all');
        });
    });

    describe('infinite scroll', () => {
        it('should load more items when triggered', () => {
            const firstPage = [
                createMockHistoryItem({ versionId: 1 }),
                createMockHistoryItem({ versionId: 2 }),
            ];
            articleService.getArticlesHistory.mockReturnValue(
                of(createMockResponse(firstPage, 50))
            );
            spectator.detectChanges();

            articleService.getArticlesHistory.mockClear();
            const secondPage = [createMockHistoryItem({ versionId: 3 })];
            articleService.getArticlesHistory.mockReturnValue(
                of({ ...createMockResponse(secondPage, 50), page: 2 })
            );

            spectator.component.onLoadMore();
            spectator.detectChanges();

            expect(articleService.getArticlesHistory).toHaveBeenCalledWith({
                page: 2,
            });
        });

        it('should keep existing items when loadMore fails', () => {
            const firstPage = [
                createMockHistoryItem({ versionId: 1 }),
                createMockHistoryItem({ versionId: 2 }),
            ];
            articleService.getArticlesHistory.mockReturnValue(
                of(createMockResponse(firstPage, 50))
            );
            spectator.detectChanges();

            expect(spectator.component.hasItems()).toBe(true);

            articleService.getArticlesHistory.mockReturnValue(
                throwError(() => new Error('Network error'))
            );
            spectator.component.onLoadMore();
            spectator.detectChanges();

            expect(spectator.component.hasItems()).toBe(true);
            expect(spectator.component.hasError()).toBe(false);
            expect(spectator.component.isLoadingMore()).toBe(false);
        });

        it('should not load more when all items loaded', () => {
            const items = [createMockHistoryItem({ versionId: 1 })];
            articleService.getArticlesHistory.mockReturnValue(
                of(createMockResponse(items, 1))
            );
            spectator.detectChanges();

            articleService.getArticlesHistory.mockClear();
            spectator.component.onLoadMore();

            expect(articleService.getArticlesHistory).not.toHaveBeenCalled();
        });
    });

    describe('error handling', () => {
        it('should log error and set error state on failure', () => {
            const error = new Error('Network error');
            articleService.getArticlesHistory.mockReturnValue(
                throwError(() => error)
            );
            spectator.detectChanges();

            const loggerService = spectator.inject(
                LoggerService
            ) as unknown as MockLoggerService;
            expect(loggerService.mockLogger.error).toHaveBeenCalledWith(
                'Failed to load article history',
                error
            );
            expect(spectator.component.isLoading()).toBe(false);
            expect(spectator.component.hasError()).toBe(true);
        });

        it('should show error message on failure', () => {
            articleService.getArticlesHistory.mockReturnValue(
                throwError(() => new Error('fail'))
            );
            spectator.detectChanges();

            expect(spectator.query('.history-error')).toBeTruthy();
            expect(spectator.query('.history-empty')).toBeFalsy();
        });
    });
});
