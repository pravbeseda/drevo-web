import {
    ArticleHistoryService,
    HistoryDisplayItem,
} from '../../../../../services/articles/article-history/article-history.service';
import { ArticleHistoryListComponent } from './article-history-list.component';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { signal } from '@angular/core';
import { ArticleHistoryItem } from '@drevo-web/shared';

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

function createMockService(): Partial<ArticleHistoryService> {
    return {
        isLoading: signal(false),
        isLoadingMore: signal(false),
        activeFilter: signal('all' as const),
        hasError: signal(false),
        isAuthenticated: signal(true),
        hasItems: signal(false),
        displayItems: signal<readonly HistoryDisplayItem[]>([]),
        displayTotalItems: signal(0),
        onFilterChange: jest.fn(),
        onLoadMore: jest.fn(),
    };
}

describe('ArticleHistoryListComponent', () => {
    let spectator: Spectator<ArticleHistoryListComponent>;
    let mockService: ReturnType<typeof createMockService>;

    const createComponent = createComponentFactory({
        component: ArticleHistoryListComponent,
        providers: [
            {
                provide: ArticleHistoryService,
                useFactory: () => {
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
        (mockService.isLoading as any).set(true);
        spectator.detectChanges();
        expect(spectator.query('ui-spinner')).toBeTruthy();
    });

    it('should show error message on error', () => {
        (mockService.hasError as any).set(true);
        spectator.detectChanges();
        expect(spectator.query('[data-testid="history-error"]')).toBeTruthy();
    });

    it('should show empty message when no items', () => {
        spectator.detectChanges();
        expect(spectator.query('[data-testid="history-empty"]')).toBeTruthy();
    });

    it('should not show empty when loading', () => {
        (mockService.isLoading as any).set(true);
        spectator.detectChanges();
        expect(spectator.query('[data-testid="history-empty"]')).toBeFalsy();
    });

    it('should show virtual scroller when hasItems', () => {
        const items: HistoryDisplayItem[] = [
            { type: 'header', date: 'Сегодня' },
            { type: 'version', data: createMockHistoryItem() },
        ];
        (mockService.hasItems as any).set(true);
        (mockService.displayItems as any).set(items);
        (mockService.displayTotalItems as any).set(2);
        spectator.detectChanges();
        expect(spectator.query('ui-virtual-scroller')).toBeTruthy();
    });
});
