import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';
import { of, throwError } from 'rxjs';
import { ArticleService } from '../../services/articles';
import { SearchComponent } from './search.component';

const DEBOUNCE_TIME_MS = 500;

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
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
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

    it('should call articleService.searchArticles after debounce time', () => {
        spectator = createComponent();

        spectator.component.onSearchChange('angular');

        expect(mockArticleService.searchArticles).not.toHaveBeenCalled();

        jest.advanceTimersByTime(DEBOUNCE_TIME_MS);

        expect(mockArticleService.searchArticles).toHaveBeenCalledWith({
            query: 'angular',
        });
    });

    it('should not call articleService.searchArticles when search query is empty', () => {
        spectator = createComponent();

        spectator.component.onSearchChange('');

        jest.advanceTimersByTime(DEBOUNCE_TIME_MS);

        expect(mockArticleService.searchArticles).not.toHaveBeenCalled();
    });

    it('should not call articleService.searchArticles when search query is only whitespace', () => {
        spectator = createComponent();

        spectator.component.onSearchChange('   ');

        jest.advanceTimersByTime(DEBOUNCE_TIME_MS);

        expect(mockArticleService.searchArticles).not.toHaveBeenCalled();
    });

    it('should clear results immediately when search query becomes empty', () => {
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
        jest.advanceTimersByTime(DEBOUNCE_TIME_MS);
        expect(spectator.component.searchResults().length).toBe(1);

        spectator.component.onSearchChange('');
        // Results should clear immediately, no need to wait for debounce
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
        jest.advanceTimersByTime(DEBOUNCE_TIME_MS);

        expect(spectator.component.searchResults()).toEqual(mockResponse.items);
        expect(spectator.component.totalResults()).toBe(50);
        expect(spectator.component.isLoading()).toBe(false);
    });

    it('should debounce multiple rapid search inputs', () => {
        spectator = createComponent();

        spectator.component.onSearchChange('a');
        jest.advanceTimersByTime(100);
        spectator.component.onSearchChange('an');
        jest.advanceTimersByTime(100);
        spectator.component.onSearchChange('ang');
        jest.advanceTimersByTime(100);
        spectator.component.onSearchChange('angu');
        jest.advanceTimersByTime(100);
        spectator.component.onSearchChange('angul');
        jest.advanceTimersByTime(100);
        spectator.component.onSearchChange('angular');

        expect(mockArticleService.searchArticles).not.toHaveBeenCalled();

        jest.advanceTimersByTime(DEBOUNCE_TIME_MS);

        expect(mockArticleService.searchArticles).toHaveBeenCalledTimes(1);
        expect(mockArticleService.searchArticles).toHaveBeenCalledWith({
            query: 'angular',
        });
    });

    it('should not call search again if query has not changed', () => {
        spectator = createComponent();

        spectator.component.onSearchChange('test');
        jest.advanceTimersByTime(DEBOUNCE_TIME_MS);
        expect(mockArticleService.searchArticles).toHaveBeenCalledTimes(1);

        spectator.component.onSearchChange('test');
        jest.advanceTimersByTime(DEBOUNCE_TIME_MS);
        expect(mockArticleService.searchArticles).toHaveBeenCalledTimes(1);
    });

    it('should handle search errors gracefully', () => {
        mockArticleService.searchArticles.mockReturnValue(
            throwError(() => new Error('Search failed'))
        );
        spectator = createComponent();

        spectator.component.onSearchChange('test');
        jest.advanceTimersByTime(DEBOUNCE_TIME_MS);

        expect(spectator.component.searchResults()).toEqual([]);
        expect(spectator.component.totalResults()).toBe(0);
        expect(spectator.component.isLoading()).toBe(false);
    });
});
