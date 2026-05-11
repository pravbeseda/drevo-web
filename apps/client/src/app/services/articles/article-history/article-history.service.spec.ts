import { ArticleHistoryService, buildDisplayItems } from './article-history.service';
import { ArticleService } from '../article.service';
import { AuthService } from '../../auth/auth.service';
import { InworkService } from '../../inwork/inwork.service';
import { mockLoggerProvider, MockLoggerService } from '@drevo-web/core/testing';
import { LoggerService, NotificationService } from '@drevo-web/core';
import { ArticleHistoryItem, ArticleHistoryResponse, InworkItem, User } from '@drevo-web/shared';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { signal } from '@angular/core';
import { BehaviorSubject, NEVER, of, throwError } from 'rxjs';

const mockUser: User = {
    id: 1,
    login: 'testuser',
    name: 'Test User',
    email: 'test@example.com',
    role: 'user',
    permissions: { canEdit: true, canModerate: false, canAdmin: false },
};

function createMockHistoryItem(overrides: Partial<ArticleHistoryItem> = {}): ArticleHistoryItem {
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

function createMockInworkItem(overrides: Partial<InworkItem> = {}): InworkItem {
    return {
        id: 1,
        module: 'articles',
        title: 'Test Article',
        author: 'Test User',
        lastTime: '2025-01-15T12:00:00',
        age: 120,
        ...overrides,
    };
}

function createMockResponse(items: readonly ArticleHistoryItem[] = [], total = 0): ArticleHistoryResponse {
    return {
        items,
        total,
        page: 1,
        pageSize: 25,
        totalPages: Math.ceil(total / 25),
    };
}

describe('buildDisplayItems', () => {
    const referenceDate = new Date('2025-01-16T12:00:00');

    it('should return empty array for empty items', () => {
        expect(buildDisplayItems([], referenceDate)).toEqual([]);
    });

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

        const result = buildDisplayItems(items, referenceDate);

        expect(result.length).toBe(5);
        expect(result[0].type).toBe('header');
        expect(result[1].type).toBe('version');
        expect(result[2].type).toBe('version');
        expect(result[3].type).toBe('header');
        expect(result[4].type).toBe('version');
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

        const result = buildDisplayItems(items, referenceDate);
        const headers = result.filter(i => i.type === 'header');

        expect(headers.length).toBe(1);
    });
});

describe('ArticleHistoryService', () => {
    let spectator: SpectatorService<ArticleHistoryService>;
    let articleService: jest.Mocked<ArticleService>;
    let inworkService: jest.Mocked<InworkService>;
    let userSubject: BehaviorSubject<User | undefined>;

    const createService = createServiceFactory({
        service: ArticleHistoryService,
        mocks: [ArticleService, InworkService, NotificationService],
        providers: [
            mockLoggerProvider(),
            {
                provide: AuthService,
                useFactory: () => {
                    userSubject = new BehaviorSubject<User | undefined>(mockUser);
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
    });

    beforeEach(() => {
        spectator = createService();
        articleService = spectator.inject(ArticleService) as jest.Mocked<ArticleService>;
        inworkService = spectator.inject(InworkService) as jest.Mocked<InworkService>;
        inworkService.getInworkList.mockReturnValue(of([]));
        inworkService.clearEditing.mockReturnValue(of(undefined));
    });

    it('should create', () => {
        expect(spectator.service).toBeTruthy();
    });

    describe('init() without articleId (global history mode)', () => {
        it('should load history on init', () => {
            articleService.getArticlesHistory.mockReturnValue(of(createMockResponse()));
            spectator.service.init();
            expect(articleService.getArticlesHistory).toHaveBeenCalledWith({
                page: 1,
            });
        });

        it('should set isLoading while loading', () => {
            articleService.getArticlesHistory.mockReturnValue(NEVER);
            spectator.service.init();
            expect(spectator.service.isLoading()).toBe(true);
        });

        it('should display items after loading', () => {
            const items = [
                createMockHistoryItem({ versionId: 1, title: 'Article One' }),
                createMockHistoryItem({ versionId: 2, title: 'Article Two' }),
            ];
            articleService.getArticlesHistory.mockReturnValue(of(createMockResponse(items, 2)));
            spectator.service.init();

            expect(spectator.service.hasItems()).toBe(true);
            expect(spectator.service.isLoading()).toBe(false);
        });

        it('should have empty state when no items', () => {
            articleService.getArticlesHistory.mockReturnValue(of(createMockResponse()));
            spectator.service.init();

            expect(spectator.service.hasItems()).toBe(false);
        });
    });

    describe('init() with articleId signal (article-scoped mode)', () => {
        it('should load history with articleId', () => {
            articleService.getArticlesHistory.mockReturnValue(of(createMockResponse()));
            const articleId = signal<number | undefined>(100);
            spectator.service.init({ articleId });

            expect(articleService.getArticlesHistory).toHaveBeenCalledWith({
                page: 1,
                articleId: 100,
            });
        });

        it('should not load when articleId is undefined', () => {
            const articleId = signal<number | undefined>(undefined);
            spectator.service.init({ articleId });

            expect(articleService.getArticlesHistory).not.toHaveBeenCalled();
            expect(spectator.service.isLoading()).toBe(false);
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
            articleService.getArticlesHistory.mockReturnValue(of(createMockResponse(items, 3)));
            spectator.service.init();

            const displayItems = spectator.service.displayItems();
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
            articleService.getArticlesHistory.mockReturnValue(of(createMockResponse(items, 2)));
            spectator.service.init();

            const displayItems = spectator.service.displayItems();
            const headers = displayItems.filter(i => i.type === 'header');
            expect(headers.length).toBe(1);
        });
    });

    describe('display items', () => {
        it('should include approval status in version items', () => {
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
            articleService.getArticlesHistory.mockReturnValue(of(createMockResponse(items, 3)));
            spectator.service.init();

            const displayItems = spectator.service.displayItems();
            const versionItems = displayItems.filter(i => i.type === 'version');

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
            const items = [createMockHistoryItem({ versionId: 1, date: testDate })];
            articleService.getArticlesHistory.mockReturnValue(of(createMockResponse(items, 1)));
            spectator.service.init();

            const displayItems = spectator.service.displayItems();
            const versionItem = displayItems.find(i => i.type === 'version');

            expect(versionItem).toMatchObject({
                type: 'version',
                data: expect.objectContaining({ date: testDate }),
            });
        });

        it('should prepend inwork items before history items', () => {
            inworkService.getInworkList.mockReturnValue(
                of([
                    createMockInworkItem({ id: 1, title: 'Own Article', author: 'Test User' }),
                    createMockInworkItem({ id: 2, title: 'Other Article', author: 'Other User' }),
                ]),
            );
            articleService.getArticlesHistory.mockReturnValue(of(createMockResponse([createMockHistoryItem()], 1)));

            spectator.service.init();

            const displayItems = spectator.service.displayItems();
            expect(displayItems[0]).toEqual({ type: 'inwork-header' });
            expect(displayItems[1]).toMatchObject({ type: 'inwork-item', isOwn: true });
            expect(displayItems[2]).toMatchObject({ type: 'inwork-item', isOwn: false });
            expect(displayItems[3].type).toBe('header');
        });

        it('should expose inwork version ids for edited articles only', () => {
            inworkService.getInworkList.mockReturnValue(
                of([
                    createMockInworkItem({ id: 10 }),
                    createMockInworkItem({ id: 0 }),
                    createMockInworkItem({ id: 11 }),
                ]),
            );
            articleService.getArticlesHistory.mockReturnValue(of(createMockResponse()));

            spectator.service.init();

            expect(spectator.service.inworkVersionIds()).toEqual(new Set([10, 11]));
        });
    });

    describe('isAuthenticated', () => {
        it('should be true when user is available', () => {
            articleService.getArticlesHistory.mockReturnValue(of(createMockResponse()));
            spectator.service.init();

            expect(spectator.service.isAuthenticated()).toBe(true);
        });

        it('should be false when user is undefined', () => {
            userSubject.next(undefined);
            articleService.getArticlesHistory.mockReturnValue(of(createMockResponse()));
            spectator.service.init();

            expect(spectator.service.isAuthenticated()).toBe(false);
        });
    });

    describe('filters', () => {
        beforeEach(() => {
            articleService.getArticlesHistory.mockReturnValue(of(createMockResponse()));
            spectator.service.init();
        });

        it('should default to "all" filter', () => {
            expect(spectator.service.activeFilter()).toBe('all');
        });

        it('should reload with approved=0 when unchecked filter selected', () => {
            articleService.getArticlesHistory.mockClear();
            articleService.getArticlesHistory.mockReturnValue(of(createMockResponse()));

            spectator.service.onFilterChange('unchecked');

            expect(articleService.getArticlesHistory).toHaveBeenCalledWith({
                page: 1,
                approved: 0,
            });
        });

        it('should reload with author when "my" filter selected', () => {
            articleService.getArticlesHistory.mockClear();
            articleService.getArticlesHistory.mockReturnValue(of(createMockResponse()));

            spectator.service.onFilterChange('my');

            expect(articleService.getArticlesHistory).toHaveBeenCalledWith({
                page: 1,
                author: 'testuser',
            });
        });

        it('should not reload when selecting same filter', () => {
            articleService.getArticlesHistory.mockClear();

            spectator.service.onFilterChange('all');

            expect(articleService.getArticlesHistory).not.toHaveBeenCalled();
        });

        it('should clear inwork items when selecting non-all filter', () => {
            inworkService.getInworkList.mockReturnValue(of([createMockInworkItem({ id: 10 })]));
            articleService.getArticlesHistory.mockReturnValue(of(createMockResponse()));
            spectator.service.init();
            expect(spectator.service.inworkVersionIds()).toEqual(new Set([10]));

            articleService.getArticlesHistory.mockReturnValue(of(createMockResponse()));
            spectator.service.onFilterChange('unchecked');

            expect(spectator.service.inworkVersionIds()).toEqual(new Set());
        });

        it('should reload inwork items when switching back to all filter', () => {
            inworkService.getInworkList.mockReturnValue(of([createMockInworkItem({ id: 10 })]));
            articleService.getArticlesHistory.mockReturnValue(of(createMockResponse()));
            spectator.service.init();

            articleService.getArticlesHistory.mockReturnValue(of(createMockResponse()));
            spectator.service.onFilterChange('unchecked');
            expect(spectator.service.inworkVersionIds()).toEqual(new Set());

            inworkService.getInworkList.mockClear();
            inworkService.getInworkList.mockReturnValue(of([createMockInworkItem({ id: 20 })]));
            articleService.getArticlesHistory.mockReturnValue(of(createMockResponse()));
            spectator.service.onFilterChange('all');

            expect(inworkService.getInworkList).toHaveBeenCalledTimes(1);
            expect(spectator.service.inworkVersionIds()).toEqual(new Set([20]));
        });

        it('should not load when "my" filter selected and user not available', () => {
            userSubject.next(undefined);

            articleService.getArticlesHistory.mockClear();
            spectator.service.onFilterChange('my');

            expect(articleService.getArticlesHistory).not.toHaveBeenCalled();
        });

        it.each(['unfinished', 'unmarked', 'outside_dictionaries', 'required'] as const)(
            'should load without extra params for unsupported "%s" filter',
            filter => {
                articleService.getArticlesHistory.mockClear();
                articleService.getArticlesHistory.mockReturnValue(of(createMockResponse()));

                spectator.service.onFilterChange(filter);

                expect(articleService.getArticlesHistory).toHaveBeenCalledWith({
                    page: 1,
                });
            },
        );

        it('should log info for unsupported filter', () => {
            articleService.getArticlesHistory.mockClear();
            articleService.getArticlesHistory.mockReturnValue(of(createMockResponse()));

            spectator.service.onFilterChange('unfinished');

            const loggerService = spectator.inject(LoggerService) as unknown as MockLoggerService;
            expect(loggerService.mockLogger.info).toHaveBeenCalledWith('Filter not yet supported by backend', {
                filter: 'unfinished',
            });
        });

        it('should reset items and error state when changing filter', () => {
            articleService.getArticlesHistory.mockReturnValue(throwError(() => new Error('fail')));
            spectator.service.onFilterChange('unchecked');

            expect(spectator.service.hasError()).toBe(true);

            articleService.getArticlesHistory.mockReturnValue(of(createMockResponse([createMockHistoryItem()], 1)));
            spectator.service.onFilterChange('all');

            expect(spectator.service.hasError()).toBe(false);
            expect(spectator.service.activeFilter()).toBe('all');
        });
    });

    describe('filters with articleId', () => {
        it('should include articleId in filter params', () => {
            const articleId = signal<number | undefined>(100);
            articleService.getArticlesHistory.mockReturnValue(of(createMockResponse()));
            spectator.service.init({ articleId });

            articleService.getArticlesHistory.mockClear();
            articleService.getArticlesHistory.mockReturnValue(of(createMockResponse()));

            spectator.service.onFilterChange('unchecked');

            expect(articleService.getArticlesHistory).toHaveBeenCalledWith({
                page: 1,
                articleId: 100,
                approved: 0,
            });
        });

        it('should not load inwork list in article-scoped mode', () => {
            const articleId = signal<number | undefined>(100);
            articleService.getArticlesHistory.mockReturnValue(of(createMockResponse()));

            spectator.service.init({ articleId });

            expect(inworkService.getInworkList).not.toHaveBeenCalled();
        });
    });

    describe('inwork actions', () => {
        it('should load inwork list on init in global all mode', () => {
            articleService.getArticlesHistory.mockReturnValue(of(createMockResponse()));

            spectator.service.init();

            expect(inworkService.getInworkList).toHaveBeenCalled();
        });

        it('should remove inwork item after cancel', () => {
            inworkService.getInworkList.mockReturnValue(
                of([
                    createMockInworkItem({ title: 'Remove me', id: 1 }),
                    createMockInworkItem({ title: 'Keep me', id: 2 }),
                ]),
            );
            articleService.getArticlesHistory.mockReturnValue(of(createMockResponse()));
            spectator.service.init();

            spectator.service.onCancelInwork('Remove me');

            const inworkItems = spectator.service.displayItems().filter(item => item.type === 'inwork-item');
            expect(inworkService.clearEditing).toHaveBeenCalledWith('Remove me');
            expect(inworkItems).toHaveLength(1);
            expect(inworkItems[0]).toMatchObject({ data: expect.objectContaining({ title: 'Keep me' }) });
        });

        it('should show error notification when cancel fails', () => {
            inworkService.getInworkList.mockReturnValue(of([createMockInworkItem({ title: 'Fail me', id: 1 })]));
            inworkService.clearEditing.mockReturnValue(throwError(() => new Error('Network error')));
            articleService.getArticlesHistory.mockReturnValue(of(createMockResponse()));
            spectator.service.init();

            spectator.service.onCancelInwork('Fail me');

            const notificationService = spectator.inject(NotificationService) as jest.Mocked<NotificationService>;
            expect(notificationService.error).toHaveBeenCalledWith('Не удалось снять метку редактирования');
            const inworkItems = spectator.service.displayItems().filter(item => item.type === 'inwork-item');
            expect(inworkItems).toHaveLength(1);
        });
    });

    describe('infinite scroll', () => {
        it('should load more items when triggered', () => {
            const firstPage = [createMockHistoryItem({ versionId: 1 }), createMockHistoryItem({ versionId: 2 })];
            articleService.getArticlesHistory.mockReturnValue(of(createMockResponse(firstPage, 50)));
            spectator.service.init();

            articleService.getArticlesHistory.mockClear();
            const secondPage = [createMockHistoryItem({ versionId: 3 })];
            articleService.getArticlesHistory.mockReturnValue(of({ ...createMockResponse(secondPage, 50), page: 2 }));

            spectator.service.onLoadMore();

            expect(articleService.getArticlesHistory).toHaveBeenCalledWith({
                page: 2,
            });
        });

        it('should load more with articleId', () => {
            const articleId = signal<number | undefined>(100);
            const firstPage = [
                createMockHistoryItem({ versionId: 1, articleId: 100 }),
                createMockHistoryItem({ versionId: 2, articleId: 100 }),
            ];
            articleService.getArticlesHistory.mockReturnValue(of(createMockResponse(firstPage, 50)));
            spectator.service.init({ articleId });

            articleService.getArticlesHistory.mockClear();
            const secondPage = [createMockHistoryItem({ versionId: 3, articleId: 100 })];
            articleService.getArticlesHistory.mockReturnValue(of({ ...createMockResponse(secondPage, 50), page: 2 }));

            spectator.service.onLoadMore();

            expect(articleService.getArticlesHistory).toHaveBeenCalledWith({
                page: 2,
                articleId: 100,
            });
        });

        it('should keep existing items when loadMore fails', () => {
            const firstPage = [createMockHistoryItem({ versionId: 1 }), createMockHistoryItem({ versionId: 2 })];
            articleService.getArticlesHistory.mockReturnValue(of(createMockResponse(firstPage, 50)));
            spectator.service.init();

            expect(spectator.service.hasItems()).toBe(true);

            articleService.getArticlesHistory.mockReturnValue(throwError(() => new Error('Network error')));
            spectator.service.onLoadMore();

            expect(spectator.service.hasItems()).toBe(true);
            expect(spectator.service.hasError()).toBe(false);
            expect(spectator.service.isLoadingMore()).toBe(false);
        });

        it('should not load more when all items loaded', () => {
            const items = [createMockHistoryItem({ versionId: 1 })];
            articleService.getArticlesHistory.mockReturnValue(of(createMockResponse(items, 1)));
            spectator.service.init();

            articleService.getArticlesHistory.mockClear();
            spectator.service.onLoadMore();

            expect(articleService.getArticlesHistory).not.toHaveBeenCalled();
        });
    });

    describe('displayTotalItems', () => {
        it('should return 0 when no items', () => {
            articleService.getArticlesHistory.mockReturnValue(of(createMockResponse()));
            spectator.service.init();

            expect(spectator.service.displayTotalItems()).toBe(0);
        });

        it('should include inwork header and items when history is empty', () => {
            inworkService.getInworkList.mockReturnValue(of([createMockInworkItem(), createMockInworkItem({ id: 2 })]));
            articleService.getArticlesHistory.mockReturnValue(of(createMockResponse()));

            spectator.service.init();

            expect(spectator.service.displayTotalItems()).toBe(3);
        });

        it('should return loaded display count when all loaded', () => {
            const items = [
                createMockHistoryItem({
                    versionId: 1,
                    date: new Date('2025-01-15T14:00:00'),
                }),
                createMockHistoryItem({
                    versionId: 2,
                    date: new Date('2025-01-15T13:00:00'),
                }),
            ];
            articleService.getArticlesHistory.mockReturnValue(of(createMockResponse(items, 2)));
            spectator.service.init();

            // 1 header + 2 versions = 3
            expect(spectator.service.displayTotalItems()).toBe(3);
        });

        it('should estimate total with unloaded items', () => {
            const items = [
                createMockHistoryItem({
                    versionId: 1,
                    date: new Date('2025-01-15T14:00:00'),
                }),
            ];
            articleService.getArticlesHistory.mockReturnValue(of(createMockResponse(items, 50)));
            spectator.service.init();

            // 1 header + 1 version = 2 loaded display + (50 - 1) unloaded = 51
            expect(spectator.service.displayTotalItems()).toBe(51);
        });
    });

    describe('error handling', () => {
        it('should log error and set error state on failure', () => {
            const error = new Error('Network error');
            articleService.getArticlesHistory.mockReturnValue(throwError(() => error));
            spectator.service.init();

            const loggerService = spectator.inject(LoggerService) as unknown as MockLoggerService;
            expect(loggerService.mockLogger.error).toHaveBeenCalledWith('Failed to load article history', error);
            expect(spectator.service.isLoading()).toBe(false);
            expect(spectator.service.hasError()).toBe(true);
        });

        it('should log error when articleId is not available', () => {
            const articleId = signal<number | undefined>(undefined);
            spectator.service.init({ articleId });

            const loggerService = spectator.inject(LoggerService) as unknown as MockLoggerService;
            expect(loggerService.mockLogger.error).toHaveBeenCalledWith(
                'Cannot load history: article ID not available',
            );
        });
    });
});
