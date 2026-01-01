import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';
import { of } from 'rxjs';
import { ArticleService } from '../../services/articles';
import { SearchComponent } from './search.component';

describe('SearchComponent', () => {
    let spectator: Spectator<SearchComponent>;

    const mockArticleService = {
        searchArticles: jest.fn().mockReturnValue(
            of({
                items: [],
                total: 0,
                page: 1,
                pageSize: 25,
                totalPages: 0,
            })
        ),
    };

    const createComponent = createComponentFactory({
        component: SearchComponent,
        providers: [{ provide: ArticleService, useValue: mockArticleService }],
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should create', () => {
        spectator = createComponent();

        expect(spectator.component).toBeTruthy();
    });

    it('should update searchQuery when onSearchChange is called', () => {
        spectator = createComponent();

        expect(spectator.component.searchQuery()).toBe('');

        spectator.component.onSearchChange('test query');

        expect(spectator.component.searchQuery()).toBe('test query');
    });

    it('should call articleService.searchArticles when search query is not empty', () => {
        spectator = createComponent();

        spectator.component.onSearchChange('angular');

        expect(mockArticleService.searchArticles).toHaveBeenCalledWith({
            query: 'angular',
        });
    });

    it('should not call articleService.searchArticles when search query is empty', () => {
        spectator = createComponent();

        spectator.component.onSearchChange('');

        expect(mockArticleService.searchArticles).not.toHaveBeenCalled();
    });

    it('should clear results when search query becomes empty', () => {
        mockArticleService.searchArticles.mockReturnValue(
            of({
                items: [{ id: 1, title: 'Test Article' }],
                total: 1,
                page: 1,
                pageSize: 25,
                totalPages: 1,
            })
        );
        spectator = createComponent();

        spectator.component.onSearchChange('test');
        expect(spectator.component.searchResults().length).toBe(1);

        spectator.component.onSearchChange('');
        expect(spectator.component.searchResults().length).toBe(0);
        expect(spectator.component.totalResults()).toBe(0);
    });

    it('should update searchResults and totalResults on successful search', () => {
        const mockResponse = {
            items: [
                { id: 1, title: 'Article 1' },
                { id: 2, title: 'Article 2' },
            ],
            total: 50,
            page: 1,
            pageSize: 25,
            totalPages: 2,
        };
        mockArticleService.searchArticles.mockReturnValue(of(mockResponse));
        spectator = createComponent();

        spectator.component.onSearchChange('test');

        expect(spectator.component.searchResults()).toEqual(mockResponse.items);
        expect(spectator.component.totalResults()).toBe(50);
        expect(spectator.component.isLoading()).toBe(false);
    });
});
