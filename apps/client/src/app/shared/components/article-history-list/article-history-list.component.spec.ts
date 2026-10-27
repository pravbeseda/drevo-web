import {
    ArticleHistoryService,
    HistoryDisplayItem,
    HistoryFilter,
} from '../../../services/articles/article-history/article-history.service';
import { AuthService } from '../../../services/auth/auth.service';
import { ModerationSheetComponent } from '../moderation-sheet/moderation-sheet.component';
import { ArticleHistoryListComponent } from './article-history-list.component';
import { createComponentFactory, mockProvider, Spectator } from '@ngneat/spectator/jest';
import { signal, WritableSignal } from '@angular/core';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import {
    ApprovalStatus,
    ArticleHistoryItem,
    InworkItem,
    ModerationResult,
    ReviewSummary,
    User,
} from '@drevo-web/shared';
import { createMockUser } from '@drevo-web/shared/testing';
import { ModalService } from '@drevo-web/ui/modal';
import { VirtualScrollerComponent } from '@drevo-web/ui/virtual-scroller';
import { BehaviorSubject, Observable, of } from 'rxjs';

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
        title: 'Тестовая статья',
        author: 'Test User',
        lastTime: '2025-01-15T12:00:00',
        age: 120,
        ...overrides,
    };
}

interface MockArticleHistoryService {
    readonly isLoading: WritableSignal<boolean>;
    readonly isLoadingMore: WritableSignal<boolean>;
    readonly activeFilter: WritableSignal<HistoryFilter>;
    readonly hasError: WritableSignal<boolean>;
    readonly isAuthenticated: WritableSignal<boolean>;
    readonly hasItems: WritableSignal<boolean>;
    readonly displayItems: WritableSignal<readonly HistoryDisplayItem[]>;
    readonly displayTotalItems: WritableSignal<number>;
    readonly inworkVersionIds: WritableSignal<ReadonlySet<number>>;
    readonly reviewSummaries: WritableSignal<ReadonlyMap<number, ReviewSummary>>;
    readonly onFilterChange: jest.Mock;
    readonly onLoadMore: jest.Mock;
    readonly onCancelInwork: jest.Mock;
    readonly applyModeration: jest.Mock;
}

function createMockService(): MockArticleHistoryService {
    return {
        isLoading: signal(false),
        isLoadingMore: signal(false),
        activeFilter: signal<HistoryFilter>('all'),
        hasError: signal(false),
        isAuthenticated: signal(true),
        hasItems: signal(false),
        displayItems: signal<readonly HistoryDisplayItem[]>([]),
        displayTotalItems: signal(0),
        inworkVersionIds: signal<ReadonlySet<number>>(new Set()),
        reviewSummaries: signal<ReadonlyMap<number, ReviewSummary>>(new Map()),
        onFilterChange: jest.fn(),
        onLoadMore: jest.fn(),
        onCancelInwork: jest.fn(),
        applyModeration: jest.fn(),
    };
}

describe('ArticleHistoryListComponent', () => {
    let spectator: Spectator<ArticleHistoryListComponent>;
    let mockService: MockArticleHistoryService;
    let userSubject: BehaviorSubject<User | undefined>;
    let sheetResult: Observable<ModerationResult | undefined>;

    const createComponent = createComponentFactory({
        component: ArticleHistoryListComponent,
        providers: [
            mockLoggerProvider(),
            mockProvider(ModalService, { open: jest.fn(() => sheetResult) }),
            {
                provide: AuthService,
                useFactory: () => ({ user$: userSubject.asObservable() }),
            },
            {
                provide: ArticleHistoryService,
                useFactory: (): MockArticleHistoryService => {
                    mockService = createMockService();
                    return mockService;
                },
            },
        ],
        detectChanges: false,
    });

    beforeEach(() => {
        userSubject = new BehaviorSubject<User | undefined>(createMockUser());
        sheetResult = of(undefined);
        spectator = createComponent();
    });

    it('should create', () => {
        spectator.detectChanges();
        expect(spectator.component).toBeTruthy();
    });

    it('should show spinner while loading', () => {
        mockService.isLoading.set(true);
        spectator.detectChanges();
        expect(spectator.query('ui-spinner')).toBeTruthy();
    });

    it('should show error message on error', () => {
        mockService.hasError.set(true);
        spectator.detectChanges();
        expect(spectator.query('[data-testid="history-error"]')).toBeTruthy();
    });

    it('should show empty message when no items', () => {
        spectator.detectChanges();
        expect(spectator.query('[data-testid="history-empty"]')).toBeTruthy();
    });

    it('should not show empty when loading', () => {
        mockService.isLoading.set(true);
        spectator.detectChanges();
        expect(spectator.query('[data-testid="history-empty"]')).toBeFalsy();
    });

    it('should show virtual scroller when hasItems', () => {
        const items: HistoryDisplayItem[] = [
            { type: 'header', date: 'Сегодня' },
            { type: 'version', data: createMockHistoryItem() },
        ];
        mockService.hasItems.set(true);
        mockService.displayItems.set(items);
        mockService.displayTotalItems.set(2);
        spectator.detectChanges();
        expect(spectator.query('ui-virtual-scroller')).toBeTruthy();
    });

    it('should pass inwork display items to virtual scroller', () => {
        const items: HistoryDisplayItem[] = [
            { type: 'inwork-header' },
            { type: 'inwork-item', data: createMockInworkItem(), isOwn: true },
        ];
        mockService.hasItems.set(true);
        mockService.displayItems.set(items);
        mockService.displayTotalItems.set(2);
        spectator.detectChanges();

        expect(spectator.query(VirtualScrollerComponent)?.items()).toEqual(items);
    });

    it('should delegate inwork cancel to service', () => {
        spectator.component.onCancelInwork('Тестовая статья');

        expect(mockService.onCancelInwork).toHaveBeenCalledWith('Тестовая статья');
    });

    it('should have selectable false by default', () => {
        spectator.detectChanges();
        expect(spectator.component.selectable()).toBe(false);
    });

    it('should have empty selectedVersionIds by default', () => {
        spectator.detectChanges();
        expect(spectator.component.selectedVersionIds().size).toBe(0);
    });

    describe('moderation', () => {
        const item = createMockHistoryItem({ versionId: 7, approved: ApprovalStatus.Pending });
        const result: ModerationResult = {
            versionId: 7,
            articleId: 100,
            approved: ApprovalStatus.Approved,
            comment: 'Хорошо',
        };

        it('should let a moderator moderate', () => {
            userSubject.next(createMockUser({ role: 'moder', permissions: { canModerate: true } }));
            spectator.detectChanges();

            expect(spectator.component.canModerate()).toBe(true);
        });

        it('should not let a regular user or a guest moderate', () => {
            spectator.detectChanges();
            expect(spectator.component.canModerate()).toBe(false);

            userSubject.next(undefined);
            expect(spectator.component.canModerate()).toBe(false);
        });

        it('should open the moderation sheet for the item, loading it lazily', async () => {
            spectator.component.onModerate(item);

            const open = jest.mocked(spectator.inject(ModalService).open);
            expect(open).toHaveBeenCalledWith(
                expect.any(Function),
                expect.objectContaining({ data: { version: item } }),
            );
            await expect(open.mock.calls[0][0]()).resolves.toBe(ModerationSheetComponent);
        });

        it('should apply the decision to the list and emit it', () => {
            sheetResult = of(result);
            const spy = jest.fn();
            spectator.output('moderated').subscribe(spy);

            spectator.component.onModerate(item);

            expect(mockService.applyModeration).toHaveBeenCalledWith(result);
            expect(spy).toHaveBeenCalledWith(result);
        });

        it('should change nothing when the sheet is closed without a decision', () => {
            const spy = jest.fn();
            spectator.output('moderated').subscribe(spy);

            spectator.component.onModerate(item);

            expect(mockService.applyModeration).not.toHaveBeenCalled();
            expect(spy).not.toHaveBeenCalled();
        });
    });
});
