import { ArticleLinkedHereTabComponent } from './article-linkedhere-tab.component';
import { ArticlePageService } from '../../../../services/article-page.service';
import { ArticleService } from '../../../../../../services/articles';
import { createMockArticle } from '../../../../testing/article-testing.helper';
import { Meta } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';
import { of, throwError } from 'rxjs';

const DEBOUNCE_TIME_MS = 500;

describe('ArticleLinkedHereTabComponent', () => {
    let spectator: Spectator<ArticleLinkedHereTabComponent>;

    const emptyResponse = {
        items: [],
        total: 0,
        page: 1,
        pageSize: 25,
        totalPages: 0,
    };

    const mockArticleService = {
        getLinkedHere: jest.fn().mockReturnValue(of(emptyResponse)),
    };

    const mockMeta = {
        addTag: jest.fn(),
        removeTag: jest.fn(),
    };

    const createComponent = createComponentFactory({
        component: ArticleLinkedHereTabComponent,
        providers: [
            mockLoggerProvider(),
            { provide: ArticleService, useValue: mockArticleService },
            { provide: Meta, useValue: mockMeta },
            {
                provide: ArticlePageService,
                useValue: {
                    article: signal(createMockArticle({ title: 'Target' })),
                    title: signal('Target'),
                },
            },
            provideRouter([]),
        ],
    });

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
        mockArticleService.getLinkedHere.mockReturnValue(of(emptyResponse));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should create', () => {
        spectator = createComponent();
        expect(spectator.component).toBeTruthy();
    });

    it('should add noindex robots meta tag on init and remove on destroy', () => {
        spectator = createComponent();
        expect(mockMeta.addTag).toHaveBeenCalledWith({ name: 'robots', content: 'noindex, nofollow' });

        spectator.fixture.destroy();
        expect(mockMeta.removeTag).toHaveBeenCalledWith('name="robots"');
    });

    it('should perform initial load with article title and empty query after debounce', () => {
        spectator = createComponent();
        expect(mockArticleService.getLinkedHere).not.toHaveBeenCalled();

        jest.advanceTimersByTime(DEBOUNCE_TIME_MS);

        expect(mockArticleService.getLinkedHere).toHaveBeenCalledWith({
            title: 'Target',
            query: '',
            page: 1,
        });
    });

    it('should debounce rapid search changes and call only with the latest value', () => {
        spectator = createComponent();
        jest.advanceTimersByTime(DEBOUNCE_TIME_MS);
        mockArticleService.getLinkedHere.mockClear();

        spectator.component.onSearchChange('a');
        spectator.component.onSearchChange('ab');
        spectator.component.onSearchChange('abc');

        expect(mockArticleService.getLinkedHere).not.toHaveBeenCalled();
        jest.advanceTimersByTime(DEBOUNCE_TIME_MS);

        expect(mockArticleService.getLinkedHere).toHaveBeenCalledTimes(1);
        expect(mockArticleService.getLinkedHere).toHaveBeenLastCalledWith({
            title: 'Target',
            query: 'abc',
            page: 1,
        });
    });

    it('should not call service again when the same query is entered twice', () => {
        spectator = createComponent();
        jest.advanceTimersByTime(DEBOUNCE_TIME_MS);
        mockArticleService.getLinkedHere.mockClear();

        spectator.component.onSearchChange('foo');
        jest.advanceTimersByTime(DEBOUNCE_TIME_MS);
        expect(mockArticleService.getLinkedHere).toHaveBeenCalledTimes(1);

        spectator.component.onSearchChange('foo');
        jest.advanceTimersByTime(DEBOUNCE_TIME_MS);
        expect(mockArticleService.getLinkedHere).toHaveBeenCalledTimes(1);
    });

    it('should trim whitespace from input before storing/searching', () => {
        spectator = createComponent();
        jest.advanceTimersByTime(DEBOUNCE_TIME_MS);
        mockArticleService.getLinkedHere.mockClear();

        spectator.component.onSearchChange('  bar  ');
        jest.advanceTimersByTime(DEBOUNCE_TIME_MS);

        expect(spectator.component.searchQuery()).toBe('bar');
        expect(mockArticleService.getLinkedHere).toHaveBeenCalledWith({
            title: 'Target',
            query: 'bar',
            page: 1,
        });
    });

    it('should update items, total and clear loading after successful load', () => {
        const response = {
            items: [{ id: 1, title: 'A' }],
            total: 1,
            page: 1,
            pageSize: 25,
            totalPages: 1,
        };
        mockArticleService.getLinkedHere.mockReturnValue(of(response));

        spectator = createComponent();
        jest.advanceTimersByTime(DEBOUNCE_TIME_MS);

        expect(spectator.component.items()).toEqual(response.items);
        expect(spectator.component.total()).toBe(1);
        expect(spectator.component.isLoading()).toBe(false);
    });

    it('should expose isEmpty when no results and no filter', () => {
        spectator = createComponent();
        jest.advanceTimersByTime(DEBOUNCE_TIME_MS);

        expect(spectator.component.isEmpty()).toBe(true);
        expect(spectator.component.isFilterEmpty()).toBe(false);
    });

    it('should expose isFilterEmpty when filter is non-empty and no results', () => {
        mockArticleService.getLinkedHere.mockReturnValueOnce(of(emptyResponse)).mockReturnValueOnce(of(emptyResponse));

        spectator = createComponent();
        jest.advanceTimersByTime(DEBOUNCE_TIME_MS);

        spectator.component.onSearchChange('xyz');
        jest.advanceTimersByTime(DEBOUNCE_TIME_MS);

        expect(spectator.component.isFilterEmpty()).toBe(true);
        expect(spectator.component.isEmpty()).toBe(false);
    });

    it('should handle errors during initial load without breaking the stream', () => {
        mockArticleService.getLinkedHere.mockReturnValueOnce(throwError(() => new Error('boom')));
        spectator = createComponent();
        jest.advanceTimersByTime(DEBOUNCE_TIME_MS);

        expect(spectator.component.items()).toEqual([]);
        expect(spectator.component.total()).toBe(0);
        expect(spectator.component.isLoading()).toBe(false);

        const successResponse = {
            items: [{ id: 2, title: 'B' }],
            total: 1,
            page: 1,
            pageSize: 25,
            totalPages: 1,
        };
        mockArticleService.getLinkedHere.mockReturnValueOnce(of(successResponse));
        spectator.component.onSearchChange('q');
        jest.advanceTimersByTime(DEBOUNCE_TIME_MS);

        expect(spectator.component.items()).toEqual(successResponse.items);
    });

    describe('onLoadMore', () => {
        const firstPage = {
            items: [
                { id: 1, title: 'A' },
                { id: 2, title: 'B' },
            ],
            total: 4,
            page: 1,
            pageSize: 2,
            totalPages: 2,
        };
        const secondPage = {
            items: [
                { id: 3, title: 'C' },
                { id: 4, title: 'D' },
            ],
            total: 4,
            page: 2,
            pageSize: 2,
            totalPages: 2,
        };

        it('should request next page and append items', () => {
            mockArticleService.getLinkedHere.mockReturnValueOnce(of(firstPage)).mockReturnValueOnce(of(secondPage));

            spectator = createComponent();
            jest.advanceTimersByTime(DEBOUNCE_TIME_MS);
            expect(spectator.component.items()).toEqual(firstPage.items);

            spectator.component.onLoadMore();

            expect(mockArticleService.getLinkedHere).toHaveBeenLastCalledWith({
                title: 'Target',
                query: '',
                page: 2,
            });
            expect(spectator.component.items()).toEqual([...firstPage.items, ...secondPage.items]);
            expect(spectator.component.currentPage()).toBe(2);
            expect(spectator.component.isLoadingMore()).toBe(false);
        });

        it('should not request when all items are already loaded', () => {
            const fullPage = {
                items: [{ id: 1, title: 'A' }],
                total: 1,
                page: 1,
                pageSize: 25,
                totalPages: 1,
            };
            mockArticleService.getLinkedHere.mockReturnValue(of(fullPage));

            spectator = createComponent();
            jest.advanceTimersByTime(DEBOUNCE_TIME_MS);
            expect(mockArticleService.getLinkedHere).toHaveBeenCalledTimes(1);

            spectator.component.onLoadMore();
            expect(mockArticleService.getLinkedHere).toHaveBeenCalledTimes(1);
        });

        it('should preserve existing items on load-more error', () => {
            mockArticleService.getLinkedHere
                .mockReturnValueOnce(of(firstPage))
                .mockReturnValueOnce(throwError(() => new Error('fail')));

            spectator = createComponent();
            jest.advanceTimersByTime(DEBOUNCE_TIME_MS);
            const before = spectator.component.items();

            spectator.component.onLoadMore();

            expect(spectator.component.items()).toEqual(before);
            expect(spectator.component.currentPage()).toBe(1);
            expect(spectator.component.isLoadingMore()).toBe(false);
        });
    });
});
