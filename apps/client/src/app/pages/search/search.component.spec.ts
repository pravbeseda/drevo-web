import { provideRouter } from '@angular/router';
import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';
import { delay, of, throwError } from 'rxjs';
import { MODAL_DATA, ModalData } from '@drevo-web/ui';
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

    it('should load initial results on component creation after debounce', () => {
        spectator = createComponent();

        // Initial load happens after debounce due to startWith('')
        expect(mockArticleService.searchArticles).not.toHaveBeenCalled();

        jest.advanceTimersByTime(DEBOUNCE_TIME_MS);

        expect(mockArticleService.searchArticles).toHaveBeenCalledWith({
            query: '',
            page: 1,
        });
    });

    it('should call articleService.searchArticles after debounce time', () => {
        spectator = createComponent();
        mockArticleService.searchArticles.mockClear();

        spectator.component.onSearchChange('angular');

        expect(mockArticleService.searchArticles).not.toHaveBeenCalled();

        jest.advanceTimersByTime(DEBOUNCE_TIME_MS);

        expect(mockArticleService.searchArticles).toHaveBeenCalledWith({
            query: 'angular',
            page: 1,
        });
    });

    it('should call articleService.searchArticles with empty query when search field is cleared', () => {
        spectator = createComponent();
        mockArticleService.searchArticles.mockClear();

        spectator.component.onSearchChange('');

        jest.advanceTimersByTime(DEBOUNCE_TIME_MS);

        expect(mockArticleService.searchArticles).toHaveBeenCalledWith({
            query: '',
            page: 1,
        });
    });

    it('should trim whitespace from search query before calling service', () => {
        spectator = createComponent();
        jest.advanceTimersByTime(DEBOUNCE_TIME_MS); // wait for initial load
        mockArticleService.searchArticles.mockClear();

        spectator.component.onSearchChange('   ');

        jest.advanceTimersByTime(DEBOUNCE_TIME_MS);

        // Query is trimmed, so '   ' becomes '' which is same as initial - no new call due to distinctUntilChanged
        expect(mockArticleService.searchArticles).not.toHaveBeenCalled();
    });

    it('should reload all results when search query becomes empty after debounce', () => {
        const searchResponse = {
            items: [{ id: 1, title: 'Test Article' }],
            total: 1,
            page: 1,
            pageSize: 25,
            totalPages: 1,
        };
        const allArticlesResponse = {
            items: [
                { id: 1, title: 'Article 1' },
                { id: 2, title: 'Article 2' },
            ],
            total: 2,
            page: 1,
            pageSize: 25,
            totalPages: 1,
        };
        mockArticleService.searchArticles
            .mockReturnValueOnce(of(allArticlesResponse)) // initial load
            .mockReturnValueOnce(of(searchResponse)) // search for 'test'
            .mockReturnValueOnce(of(allArticlesResponse)); // clear search

        spectator = createComponent();
        jest.advanceTimersByTime(DEBOUNCE_TIME_MS); // wait for initial load
        expect(spectator.component.searchResults().length).toBe(2);

        spectator.component.onSearchChange('test');
        jest.advanceTimersByTime(DEBOUNCE_TIME_MS);
        expect(spectator.component.searchResults().length).toBe(1);

        spectator.component.onSearchChange('');
        jest.advanceTimersByTime(DEBOUNCE_TIME_MS);
        // Results reload with all articles
        expect(spectator.component.searchResults().length).toBe(2);
        expect(spectator.component.totalResults()).toBe(2);
    });

    it('should update searchResults and totalResults on successful search', () => {
        const initialResponse = {
            items: [],
            total: 0,
            page: 1,
            pageSize: 25,
            totalPages: 0,
        };
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
        mockArticleService.searchArticles
            .mockReturnValueOnce(of(initialResponse)) // initial load
            .mockReturnValueOnce(of(mockResponse));
        spectator = createComponent();
        jest.advanceTimersByTime(DEBOUNCE_TIME_MS); // wait for initial load

        spectator.component.onSearchChange('test');
        jest.advanceTimersByTime(DEBOUNCE_TIME_MS);

        expect(spectator.component.searchResults()).toEqual(mockResponse.items);
        expect(spectator.component.totalResults()).toBe(50);
        expect(spectator.component.isLoading()).toBe(false);
    });

    it('should debounce multiple rapid search inputs', () => {
        spectator = createComponent();
        mockArticleService.searchArticles.mockClear();

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
        mockArticleService.searchArticles.mockClear();

        spectator.component.onSearchChange('test');
        jest.advanceTimersByTime(DEBOUNCE_TIME_MS);
        expect(mockArticleService.searchArticles).toHaveBeenCalledTimes(1);

        spectator.component.onSearchChange('test');
        jest.advanceTimersByTime(DEBOUNCE_TIME_MS);
        expect(mockArticleService.searchArticles).toHaveBeenCalledTimes(1);
    });

    it('should handle search errors gracefully', () => {
        mockArticleService.searchArticles
            .mockReturnValueOnce(
                of({
                    items: [],
                    total: 0,
                    page: 1,
                    pageSize: 25,
                    totalPages: 0,
                })
            ) // initial load
            .mockReturnValueOnce(throwError(() => new Error('Search failed'))); // search error
        spectator = createComponent();

        spectator.component.onSearchChange('test');
        jest.advanceTimersByTime(DEBOUNCE_TIME_MS);

        expect(spectator.component.searchResults()).toEqual([]);
        expect(spectator.component.totalResults()).toBe(0);
        expect(spectator.component.isLoading()).toBe(false);
    });

    it('should continue accepting new searches after an API error (stream stays alive)', () => {
        const emptyInitialResponse = {
            items: [],
            total: 0,
            page: 1,
            pageSize: 25,
            totalPages: 0,
        };
        const successResponse = {
            items: [{ id: 1, title: 'Success Result' }],
            total: 1,
            page: 1,
            pageSize: 25,
            totalPages: 1,
        };

        // Reset and setup mocks: initial load succeeds, first search fails, second search succeeds
        mockArticleService.searchArticles.mockReset();
        mockArticleService.searchArticles
            .mockReturnValueOnce(of(emptyInitialResponse))
            .mockReturnValueOnce(throwError(() => new Error('Network error')))
            .mockReturnValueOnce(of(successResponse));

        spectator = createComponent();
        jest.advanceTimersByTime(DEBOUNCE_TIME_MS); // complete initial load

        // First search - will fail
        spectator.component.onSearchChange('fail');
        jest.advanceTimersByTime(DEBOUNCE_TIME_MS);

        expect(spectator.component.searchResults()).toEqual([]);
        expect(spectator.component.totalResults()).toBe(0);
        expect(spectator.component.isLoading()).toBe(false);

        // Second search - should work (this is the key test)
        spectator.component.onSearchChange('success');
        jest.advanceTimersByTime(DEBOUNCE_TIME_MS);

        // Verify the stream is still alive and processes new requests
        expect(mockArticleService.searchArticles).toHaveBeenCalledTimes(3);
        expect(mockArticleService.searchArticles).toHaveBeenLastCalledWith({
            query: 'success',
            page: 1,
        });
        expect(spectator.component.searchResults()).toEqual(
            successResponse.items
        );
        expect(spectator.component.totalResults()).toBe(1);
        expect(spectator.component.isLoading()).toBe(false);
    });

    it('should cancel previous search request when clearing search quickly (race condition)', () => {
        // Simulate a slow HTTP request that takes 1000ms
        const initialResponse = {
            items: [{ id: 0, title: 'Initial' }],
            total: 1,
            page: 1,
            pageSize: 25,
            totalPages: 1,
        };
        const slowResponse = {
            items: [{ id: 1, title: 'Stale Result' }],
            total: 1,
            page: 1,
            pageSize: 25,
            totalPages: 1,
        };
        const emptyQueryResponse = {
            items: [
                { id: 2, title: 'All Articles 1' },
                { id: 3, title: 'All Articles 2' },
            ],
            total: 2,
            page: 1,
            pageSize: 25,
            totalPages: 1,
        };
        mockArticleService.searchArticles.mockReset();
        mockArticleService.searchArticles
            .mockReturnValueOnce(of(initialResponse)) // initial load
            .mockReturnValueOnce(of(slowResponse).pipe(delay(1000))) // slow search 'a'
            .mockReturnValueOnce(of(emptyQueryResponse).pipe(delay(50))); // clear search ''

        spectator = createComponent();
        jest.advanceTimersByTime(DEBOUNCE_TIME_MS); // wait for initial load

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

        // Wait for the clear request to complete
        jest.advanceTimersByTime(50);

        // Results should be the all articles response
        expect(spectator.component.searchResults()).toEqual(
            emptyQueryResponse.items
        );
        expect(spectator.component.isLoading()).toBe(false);

        // Now let the slow request "complete" - it should have been cancelled
        jest.advanceTimersByTime(1000);

        // Results should still be the all articles - stale response was cancelled
        expect(spectator.component.searchResults()).toEqual(
            emptyQueryResponse.items
        );
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

        // Setup: initial load completes, then search mocks
        mockArticleService.searchArticles.mockReset();
        mockArticleService.searchArticles
            .mockReturnValueOnce(
                of({
                    items: [],
                    total: 0,
                    page: 1,
                    pageSize: 25,
                    totalPages: 0,
                })
            ) // initial load
            .mockReturnValueOnce(of(staleResponse).pipe(delay(1000)))
            .mockReturnValueOnce(of(freshResponse).pipe(delay(100)));

        spectator = createComponent();
        jest.advanceTimersByTime(DEBOUNCE_TIME_MS); // wait for initial load

        // User types 'a'
        spectator.component.onSearchChange('a');
        jest.advanceTimersByTime(DEBOUNCE_TIME_MS);
        expect(mockArticleService.searchArticles).toHaveBeenCalledTimes(2); // initial + 'a'

        // User types 'abc' before first request completes
        spectator.component.onSearchChange('abc');
        jest.advanceTimersByTime(DEBOUNCE_TIME_MS);
        expect(mockArticleService.searchArticles).toHaveBeenCalledTimes(3); // + 'abc'

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

        const emptyInitialResponse = {
            items: [],
            total: 0,
            page: 1,
            pageSize: 25,
            totalPages: 0,
        };

        it('should load next page and append results to existing ones', () => {
            mockArticleService.searchArticles.mockReset();
            mockArticleService.searchArticles
                .mockReturnValueOnce(of(emptyInitialResponse)) // initial load
                .mockReturnValueOnce(of(firstPageResponse)) // search
                .mockReturnValueOnce(of(secondPageResponse)); // load more
            spectator = createComponent();
            jest.advanceTimersByTime(DEBOUNCE_TIME_MS); // wait for initial load

            // Load first page via search
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
            mockArticleService.searchArticles.mockReset();
            mockArticleService.searchArticles
                .mockReturnValueOnce(of(emptyInitialResponse)) // initial load
                .mockReturnValueOnce(of(allLoadedResponse)); // search
            spectator = createComponent();
            jest.advanceTimersByTime(DEBOUNCE_TIME_MS); // wait for initial load

            // Load first (and only) page
            spectator.component.onSearchChange('test');
            jest.advanceTimersByTime(DEBOUNCE_TIME_MS);

            expect(mockArticleService.searchArticles).toHaveBeenCalledTimes(2); // initial + search

            // Try to load more
            spectator.component.onLoadMore();

            // Should not call searchArticles again since all results are loaded
            expect(mockArticleService.searchArticles).toHaveBeenCalledTimes(2);
            expect(spectator.component.isLoadingMore()).toBe(false);
        });

        it('should set isLoadingMore to true during request', () => {
            mockArticleService.searchArticles.mockReset();
            mockArticleService.searchArticles
                .mockReturnValueOnce(of(emptyInitialResponse)) // initial load
                .mockReturnValueOnce(of(firstPageResponse)) // search
                .mockReturnValueOnce(of(secondPageResponse).pipe(delay(500))); // load more (delayed)
            spectator = createComponent();
            jest.advanceTimersByTime(DEBOUNCE_TIME_MS); // wait for initial load

            // Load first page via search
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
            mockArticleService.searchArticles.mockReset();
            mockArticleService.searchArticles
                .mockReturnValueOnce(of(emptyInitialResponse)) // initial load
                .mockReturnValueOnce(of(firstPageResponse)) // search
                .mockReturnValueOnce(
                    throwError(() => new Error('Pagination failed'))
                ); // load more error
            spectator = createComponent();
            jest.advanceTimersByTime(DEBOUNCE_TIME_MS); // wait for initial load

            // Load first page via search
            spectator.component.onSearchChange('test');
            jest.advanceTimersByTime(DEBOUNCE_TIME_MS);

            const existingResults = spectator.component.searchResults();
            expect(existingResults).toEqual(firstPageResponse.items);

            // Try to load more (will fail)
            spectator.component.onLoadMore();

            // Existing results should be preserved
            expect(spectator.component.searchResults()).toEqual(
                existingResults
            );
            expect(spectator.component.isLoadingMore()).toBe(false);
        });

        it('should not increment currentPage on error', () => {
            mockArticleService.searchArticles.mockReset();
            mockArticleService.searchArticles
                .mockReturnValueOnce(of(emptyInitialResponse)) // initial load
                .mockReturnValueOnce(of(firstPageResponse)) // search
                .mockReturnValueOnce(
                    throwError(() => new Error('Pagination failed'))
                ); // load more error
            spectator = createComponent();
            jest.advanceTimersByTime(DEBOUNCE_TIME_MS); // wait for initial load

            // Load first page via search
            spectator.component.onSearchChange('test');
            jest.advanceTimersByTime(DEBOUNCE_TIME_MS);

            expect(spectator.component.currentPage()).toBe(1);
            expect(spectator.component.searchResults().length).toBe(2);
            expect(spectator.component.totalResults()).toBe(4);

            // Try to load more (will fail)
            spectator.component.onLoadMore();

            // Page should remain unchanged
            expect(spectator.component.currentPage()).toBe(1);
        });

        it('should reset to page 1 when starting a new search', () => {
            mockArticleService.searchArticles.mockReset();
            mockArticleService.searchArticles
                .mockReturnValueOnce(of(emptyInitialResponse)) // initial load
                .mockReturnValueOnce(of(firstPageResponse)) // first search
                .mockReturnValueOnce(of(secondPageResponse)) // load more
                .mockReturnValueOnce(of(firstPageResponse)); // new search
            spectator = createComponent();
            jest.advanceTimersByTime(DEBOUNCE_TIME_MS); // wait for initial load

            // Load first page via search
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

    describe('closeModal', () => {
        it('should call modalData.close when modalData is provided', () => {
            const mockModalData: ModalData = {
                data: undefined,
                close: jest.fn(),
            };

            spectator = createComponent({
                providers: [{ provide: MODAL_DATA, useValue: mockModalData }],
            });

            spectator.component.closeModal();

            expect(mockModalData.close).toHaveBeenCalled();
        });

        it('should not throw error when modalData is not provided', () => {
            spectator = createComponent();

            expect(() => spectator.component.closeModal()).not.toThrow();
        });
    });
});
