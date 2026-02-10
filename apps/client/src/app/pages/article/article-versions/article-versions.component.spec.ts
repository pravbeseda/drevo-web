import { ArticleHistoryService } from '../../../services/articles/article-history/article-history.service';
import { ArticleVersionsComponent } from './article-versions.component';
import { ArticlePageService } from '../article-page.service';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { signal } from '@angular/core';

describe('ArticleVersionsComponent', () => {
    let spectator: Spectator<ArticleVersionsComponent>;
    const articleIdSignal = signal<number | undefined>(100);

    const mockService = {
        init: jest.fn(),
        isLoading: signal(false),
        isLoadingMore: signal(false),
        activeFilter: signal('all' as const),
        hasError: signal(false),
        canFilterByAuthor: signal(true),
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
});
