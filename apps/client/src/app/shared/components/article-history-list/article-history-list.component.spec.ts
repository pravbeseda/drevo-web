import {
    ArticleHistoryService,
    HistoryDisplayItem,
    HistoryFilter,
} from '../../../services/articles/article-history/article-history.service';
import { ArticleHistoryListComponent } from './article-history-list.component';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { signal, WritableSignal } from '@angular/core';
import { ArticleHistoryItem, InworkItem } from '@drevo-web/shared';
import { VirtualScrollerComponent } from '@drevo-web/ui';

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
    readonly onFilterChange: jest.Mock;
    readonly onLoadMore: jest.Mock;
    readonly onCancelInwork: jest.Mock;
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
        onFilterChange: jest.fn(),
        onLoadMore: jest.fn(),
        onCancelInwork: jest.fn(),
    };
}

describe('ArticleHistoryListComponent', () => {
    let spectator: Spectator<ArticleHistoryListComponent>;
    let mockService: MockArticleHistoryService;

    const createComponent = createComponentFactory({
        component: ArticleHistoryListComponent,
        providers: [
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
});
