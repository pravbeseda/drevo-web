import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';
import { provideRouter } from '@angular/router';
import { delay, of, throwError } from 'rxjs';
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
        providers: [
            { provide: ArticleService, useValue: mockArticleService },
            provideRouter([]),
        ],
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
            page: 1,
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

    it('should clear results when search query becomes empty after debounce', () => {
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
        // Results clear after debounce when using switchMap for cancellation
        jest.advanceTimersByTime(DEBOUNCE_TIME_MS);
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
            page: 1,
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

    it('should cancel previous request when clearing search quickly (race condition)', () => {
        // Simulate a slow HTTP request that takes 1000ms
        const slowResponse = {
            items: [{ id: 1, title: 'Stale Result' }],
            total: 1,
            page: 1,
            pageSize: 25,
            totalPages: 1,
        };
        mockArticleService.searchArticles.mockReturnValue(
            of(slowResponse).pipe(delay(1000))
        );
        spectator = createComponent();

        // User types 'a'
        spectator.component.onSearchChange('a');
        jest.advanceTimersByTime(DEBOUNCE_TIME_MS);

        // Request is now in flight
        expect(mockArticleService.searchArticles).toHaveBeenCalledWith({
            query: 'a',
            page: 1,
        });
        expect(spectator.component.isLoading()).toBe(true);

        // User quickly clears the input before request completes
        spectator.component.onSearchChange('');
        jest.advanceTimersByTime(DEBOUNCE_TIME_MS);

        // Results should be empty, loading should be false
        expect(spectator.component.searchResults()).toEqual([]);
        expect(spectator.component.isLoading()).toBe(false);

        // Now let the slow request "complete" - it should have been cancelled
        jest.advanceTimersByTime(1000);

        // Results should still be empty - stale response should not appear
        expect(spectator.component.searchResults()).toEqual([]);
        expect(spectator.component.totalResults()).toBe(0);
    });

    it('should cancel previous request when typing new query quickly', () => {
        const staleResponse = {
            items: [{ id: 1, title: 'Stale Result for "a"' }],
            total: 1,
            page: 1,
            pageSize: 25,
            totalPages: 1,
        };
        const freshResponse = {
            items: [{ id: 2, title: 'Fresh Result for "abc"' }],
            total: 1,
            page: 1,
            pageSize: 25,
            totalPages: 1,
        };

        mockArticleService.searchArticles
            .mockReturnValueOnce(of(staleResponse).pipe(delay(1000)))
            .mockReturnValueOnce(of(freshResponse).pipe(delay(100)));

        spectator = createComponent();

        // User types 'a'
        spectator.component.onSearchChange('a');
        jest.advanceTimersByTime(DEBOUNCE_TIME_MS);
        expect(mockArticleService.searchArticles).toHaveBeenCalledTimes(1);

        // User types 'abc' before first request completes
        spectator.component.onSearchChange('abc');
        jest.advanceTimersByTime(DEBOUNCE_TIME_MS);
        expect(mockArticleService.searchArticles).toHaveBeenCalledTimes(2);

        // Wait for second (faster) request to complete
        jest.advanceTimersByTime(100);

        // Should have fresh results, not stale
        expect(spectator.component.searchResults()).toEqual(
            freshResponse.items
        );

        // Wait for stale request to "complete"
        jest.advanceTimersByTime(1000);

        // Results should still be fresh - stale response was cancelled
        expect(spectator.component.searchResults()).toEqual(
            freshResponse.items
        );
    });

    describe('onLoadMore', () => {
        const firstPageResponse = {
            items: [
                { id: 1, title: 'Article 1' },
                { id: 2, title: 'Article 2' },
            ],
            total: 4,
            page: 1,
            pageSize: 2,
            totalPages: 2,
        };

        const secondPageResponse = {
            items: [
                { id: 3, title: 'Article 3' },
                { id: 4, title: 'Article 4' },
            ],
            total: 4,
            page: 2,
            pageSize: 2,
            totalPages: 2,
        };

        it('should load next page and append results to existing ones', () => {
            mockArticleService.searchArticles
                .mockReturnValueOnce(of(firstPageResponse))
                .mockReturnValueOnce(of(secondPageResponse));
            spectator = createComponent();

            // Load first page
            spectator.component.onSearchChange('test');
            jest.advanceTimersByTime(DEBOUNCE_TIME_MS);

            expect(spectator.component.searchResults()).toEqual(
                firstPageResponse.items
            );
            expect(spectator.component.currentPage()).toBe(1);

            // Load more
            spectator.component.onLoadMore();

            expect(mockArticleService.searchArticles).toHaveBeenLastCalledWith({
                query: 'test',
                page: 2,
            });
            expect(spectator.component.searchResults()).toEqual([
                ...firstPageResponse.items,
                ...secondPageResponse.items,
            ]);
            expect(spectator.component.currentPage()).toBe(2);
            expect(spectator.component.isLoadingMore()).toBe(false);
        });

        it('should not load more when all results are already loaded', () => {
            const allLoadedResponse = {
                items: [{ id: 1, title: 'Article 1' }],
                total: 1,
                page: 1,
                pageSize: 25,
                totalPages: 1,
            };
            mockArticleService.searchArticles.mockReturnValue(
                of(allLoadedResponse)
            );
            spectator = createComponent();

            // Load first (and only) page
            spectator.component.onSearchChange('test');
            jest.advanceTimersByTime(DEBOUNCE_TIME_MS);

            expect(mockArticleService.searchArticles).toHaveBeenCalledTimes(1);

            // Try to load more
            spectator.component.onLoadMore();

            // Should not call searchArticles again
            expect(mockArticleService.searchArticles).toHaveBeenCalledTimes(1);
            expect(spectator.component.isLoadingMore()).toBe(false);
        });

        it('should set isLoadingMore to true during request', () => {
            mockArticleService.searchArticles
                .mockReturnValueOnce(of(firstPageResponse))
                .mockReturnValueOnce(of(secondPageResponse).pipe(delay(500)));
            spectator = createComponent();

            // Load first page
            spectator.component.onSearchChange('test');
            jest.advanceTimersByTime(DEBOUNCE_TIME_MS);

            // Start loading more
            spectator.component.onLoadMore();

            expect(spectator.component.isLoadingMore()).toBe(true);

            // Complete the request
            jest.advanceTimersByTime(500);

            expect(spectator.component.isLoadingMore()).toBe(false);
        });

        it('should handle pagination errors without losing existing results', () => {
            mockArticleService.searchArticles
                .mockReturnValueOnce(of(firstPageResponse))
                .mockReturnValueOnce(
                    throwError(() => new Error('Pagination failed'))
                );
            spectator = createComponent();

            // Load first page
            spectator.component.onSearchChange('test');
            jest.advanceTimersByTime(DEBOUNCE_TIME_MS);

            const existingResults = spectator.component.searchResults();
            expect(existingResults).toEqual(firstPageResponse.items);

            // Try to load more (will fail)
            spectator.component.onLoadMore();

            // Existing results should be preserved
            expect(spectator.component.searchResults()).toEqual(existingResults);
            expect(spectator.component.isLoadingMore()).toBe(false);
        });

        it('should not increment currentPage on error', () => {
            mockArticleService.searchArticles
                .mockReturnValueOnce(of(firstPageResponse))
                .mockReturnValueOnce(
                    throwError(() => new Error('Pagination failed'))
                );
            spectator = createComponent();

            // Load first page
            spectator.component.onSearchChange('test');
            jest.advanceTimersByTime(DEBOUNCE_TIME_MS);

            expect(spectator.component.currentPage()).toBe(1);

            // Try to load more (will fail)
            spectator.component.onLoadMore();

            // Page should remain unchanged
            expect(spectator.component.currentPage()).toBe(1);
        });

        it('should reset to page 1 when starting a new search', () => {
            mockArticleService.searchArticles
                .mockReturnValueOnce(of(firstPageResponse))
                .mockReturnValueOnce(of(secondPageResponse))
                .mockReturnValueOnce(of(firstPageResponse));
            spectator = createComponent();

            // Load first page
            spectator.component.onSearchChange('test');
            jest.advanceTimersByTime(DEBOUNCE_TIME_MS);

            // Load second page
            spectator.component.onLoadMore();
            expect(spectator.component.currentPage()).toBe(2);

            // Start new search
            spectator.component.onSearchChange('new query');
            jest.advanceTimersByTime(DEBOUNCE_TIME_MS);

            expect(spectator.component.currentPage()).toBe(1);
            expect(mockArticleService.searchArticles).toHaveBeenLastCalledWith({
                query: 'new query',
                page: 1,
            });
        });
    });
});
