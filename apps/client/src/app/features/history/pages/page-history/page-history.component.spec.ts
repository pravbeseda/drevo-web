import { ArticleHistoryService } from '../../../../services/articles/article-history/article-history.service';
import { PageHistoryComponent } from './page-history.component';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { signal } from '@angular/core';

describe('PageHistoryComponent', () => {
    let spectator: Spectator<PageHistoryComponent>;

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
        onHideCancelledChange: jest.fn(),
        hideCancelled: signal(false),
        onLoadMore: jest.fn(),
    };

    const createComponent = createComponentFactory({
        component: PageHistoryComponent,
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
        spectator = createComponent({ props: { kind: 'articles' } });
    });

    it('should create', () => {
        spectator.detectChanges();
        expect(spectator.component).toBeTruthy();
    });

    it('should list the versions of the kind the route names', () => {
        spectator.detectChanges();
        expect(mockService.init).toHaveBeenCalledWith({ kind: 'articles' });
    });

    it('should list news versions on the news tab', () => {
        spectator = createComponent({ props: { kind: 'news' } });
        spectator.detectChanges();
        expect(mockService.init).toHaveBeenLastCalledWith({ kind: 'news' });
    });

    it('should render article-history-list', () => {
        spectator.detectChanges();
        expect(spectator.query('app-article-history-list')).toBeTruthy();
    });

    it('should render filters-side-panel', () => {
        spectator.detectChanges();
        expect(spectator.query('app-filters-side-panel')).toBeTruthy();
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
