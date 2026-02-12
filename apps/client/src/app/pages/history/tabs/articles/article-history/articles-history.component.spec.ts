import { ArticleHistoryService } from '../../../../../services/articles/article-history/article-history.service';
import { ArticlesHistoryComponent } from './articles-history.component';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { signal } from '@angular/core';

describe('ArticlesHistoryComponent', () => {
    let spectator: Spectator<ArticlesHistoryComponent>;

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
        component: ArticlesHistoryComponent,
        componentProviders: [
            {
                provide: ArticleHistoryService,
                useValue: mockService,
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

    it('should call service.init() with no args on ngOnInit', () => {
        spectator.detectChanges();
        expect(mockService.init).toHaveBeenCalledWith();
    });

    it('should render article-history-list', () => {
        spectator.detectChanges();
        expect(spectator.query('app-article-history-list')).toBeTruthy();
    });

    it('should render side panel', () => {
        spectator.detectChanges();
        expect(spectator.query('ui-side-panel')).toBeTruthy();
    });

    it('should toggle side panel on openFilters()', () => {
        spectator.detectChanges();
        expect(spectator.component.isSidePanelOpen()).toBe(false);

        spectator.component.openFilters();
        expect(spectator.component.isSidePanelOpen()).toBe(true);

        spectator.component.openFilters();
        expect(spectator.component.isSidePanelOpen()).toBe(false);
    });

    it('should delegate onFilterChange to service', () => {
        spectator.detectChanges();

        spectator.component.onFilterChange('unchecked');

        expect(mockService.onFilterChange).toHaveBeenCalledWith('unchecked');
    });

    it('should expose activeFilter from service', () => {
        spectator.detectChanges();
        expect(spectator.component.activeFilter()).toBe('all');
    });
});
