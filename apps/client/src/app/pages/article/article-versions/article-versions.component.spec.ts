import { ArticleHistoryService } from '../../../services/articles/article-history/article-history.service';
import { ArticleVersionsComponent } from './article-versions.component';
import { ArticlePageService } from '../article-page.service';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { ArticleHistoryItem } from '@drevo-web/shared';

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

describe('ArticleVersionsComponent', () => {
    let spectator: Spectator<ArticleVersionsComponent>;
    const articleIdSignal = signal<number | undefined>(100);

    const mockService = {
        init: jest.fn(),
        isLoading: signal(false),
        isLoadingMore: signal(false),
        activeFilter: signal('all' as const),
        hasError: signal(false),
        isAuthenticated: signal(true),
        hasItems: signal(false),
        displayItems: signal([]),
        displayTotalItems: signal(0),
        onFilterChange: jest.fn(),
        onLoadMore: jest.fn(),
    };

    const createComponent = createComponentFactory({
        component: ArticleVersionsComponent,
        componentProviders: [
            {
                provide: ArticleHistoryService,
                useValue: mockService,
            },
        ],
        providers: [
            provideRouter([]),
            {
                provide: ArticlePageService,
                useValue: {
                    articleId: articleIdSignal,
                },
            },
        ],
        detectChanges: false,
    });

    beforeEach(() => {
        jest.clearAllMocks();
        spectator = createComponent();
    });

    it('should create', () => {
        spectator.detectChanges();
        expect(spectator.component).toBeTruthy();
    });

    it('should call service.init() with articleId signal on ngOnInit', () => {
        spectator.detectChanges();
        expect(mockService.init).toHaveBeenCalledWith({
            articleId: articleIdSignal,
        });
    });

    it('should render article-history-list', () => {
        spectator.detectChanges();
        expect(spectator.query('app-article-history-list')).toBeTruthy();
    });

    describe('selection', () => {
        beforeEach(() => {
            spectator.detectChanges();
        });

        it('should start with no items selected', () => {
            expect(spectator.component.selectedCount()).toBe(0);
            expect(spectator.component.canCompare()).toBe(false);
        });

        it('should add item to selection', () => {
            spectator.component.onSelectItem(createMockItem({ versionId: 10 }));
            expect(spectator.component.selectedCount()).toBe(1);
            expect(spectator.component.selectedVersionIds().has(10)).toBe(true);
        });

        it('should toggle off already selected item', () => {
            spectator.component.onSelectItem(createMockItem({ versionId: 10 }));
            spectator.component.onSelectItem(createMockItem({ versionId: 10 }));
            expect(spectator.component.selectedCount()).toBe(0);
        });

        it('should select two items', () => {
            spectator.component.onSelectItem(createMockItem({ versionId: 10 }));
            spectator.component.onSelectItem(createMockItem({ versionId: 20 }));
            expect(spectator.component.selectedCount()).toBe(2);
            expect(spectator.component.canCompare()).toBe(true);
        });

        it('should replace the older item when selecting a third', () => {
            spectator.component.onSelectItem(createMockItem({ versionId: 10 }));
            spectator.component.onSelectItem(createMockItem({ versionId: 20 }));
            spectator.component.onSelectItem(createMockItem({ versionId: 30 }));

            expect(spectator.component.selectedCount()).toBe(2);
            expect(spectator.component.selectedVersionIds().has(10)).toBe(false);
            expect(spectator.component.selectedVersionIds().has(20)).toBe(true);
            expect(spectator.component.selectedVersionIds().has(30)).toBe(true);
        });

        it('should clear selection on Escape key', () => {
            spectator.component.onSelectItem(createMockItem({ versionId: 10 }));
            spectator.component.onSelectItem(createMockItem({ versionId: 20 }));
            expect(spectator.component.selectedCount()).toBe(2);

            spectator.dispatchKeyboardEvent(document, 'keydown', 'Escape');

            expect(spectator.component.selectedCount()).toBe(0);
            expect(spectator.component.canCompare()).toBe(false);
        });

        it('should not error on Escape when nothing is selected', () => {
            spectator.dispatchKeyboardEvent(document, 'keydown', 'Escape');
            expect(spectator.component.selectedCount()).toBe(0);
        });

        it('should navigate to diff page on compare', () => {
            const router = spectator.inject(Router);
            jest.spyOn(router, 'navigate').mockResolvedValue(true);

            spectator.component.onSelectItem(createMockItem({ versionId: 30 }));
            spectator.component.onSelectItem(createMockItem({ versionId: 10 }));
            spectator.component.onCompare();

            expect(router.navigate).toHaveBeenCalledWith(['/history/articles/diff', 10, 30]);
        });
    });
});
