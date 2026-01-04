import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import {
    HttpTestingController,
    provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ArticleApiService } from './article-api.service';

describe('ArticleApiService', () => {
    let spectator: SpectatorService<ArticleApiService>;
    let httpController: HttpTestingController;

    const createService = createServiceFactory({
        service: ArticleApiService,
        providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    beforeEach(() => {
        spectator = createService();
        httpController = spectator.inject(HttpTestingController);
    });

    afterEach(() => {
        httpController.verify();
    });

    const createMockResponse = (
        items: unknown[] = [],
        page = 1,
        pageSize = 25,
        total = 0
    ) => ({
        success: true,
        data: {
            items,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize) || 0,
        },
    });

    const expectSearchRequest = (
        params: { q?: string; page?: string; size?: string },
        response = createMockResponse()
    ) => {
        const req = httpController.expectOne(
            request =>
                request.url === '/api/articles/search' &&
                (!params.q || request.params.get('q') === params.q) &&
                (!params.page || request.params.get('page') === params.page) &&
                (!params.size || request.params.get('size') === params.size)
        );
        req.flush(response);
        return req;
    };

    describe('searchArticles', () => {
        it('should call HTTP GET with correct URL and params and extract data from wrapper', () => {
            const mockData = {
                items: [{ id: 1, title: 'Test' }],
                total: 1,
                page: 1,
                pageSize: 25,
                totalPages: 1,
            };

            spectator.service
                .searchArticles('test', 1, 25)
                .subscribe(result => {
                    expect(result).toEqual(mockData);
                });

            const req = expectSearchRequest(
                { q: 'test', page: '1', size: '25' },
                createMockResponse(mockData.items, 1, 25, 1)
            );

            expect(req.request.method).toBe('GET');
            expect(req.request.withCredentials).toBe(true);
        });

        it('should use default page and pageSize when not provided', () => {
            spectator.service.searchArticles('query').subscribe();

            expectSearchRequest({ q: 'query', page: '1', size: '25' });
        });

        it('should use custom page and pageSize when provided', () => {
            spectator.service.searchArticles('query', 3, 50).subscribe();

            expectSearchRequest({ page: '3', size: '50' });
        });

        it('should not include q param when query is empty', () => {
            spectator.service.searchArticles('').subscribe();

            const req = httpController.expectOne(request => {
                return (
                    request.url === '/api/articles/search' &&
                    !request.params.has('q') &&
                    request.params.get('page') === '1' &&
                    request.params.get('size') === '25'
                );
            });
            req.flush(createMockResponse());
        });

        it('should not include q param when query is not provided', () => {
            spectator.service.searchArticles().subscribe();

            const req = httpController.expectOne(request => {
                return (
                    request.url === '/api/articles/search' &&
                    !request.params.has('q') &&
                    request.params.get('page') === '1' &&
                    request.params.get('size') === '25'
                );
            });
            req.flush(createMockResponse());
        });
    });

    describe('error handling', () => {
        it('should throw when response.data is undefined', done => {
            spectator.service.searchArticles('test').subscribe({
                error: (err: Error) => {
                    expect(err.message).toContain('Response data is undefined');
                    done();
                },
            });

            const req = httpController.expectOne(
                request => request.url === '/api/articles/search'
            );
            req.flush({ success: true, data: undefined });
        });

        it('should throw when response.data is missing', done => {
            spectator.service.searchArticles('test').subscribe({
                error: (err: Error) => {
                    expect(err.message).toContain('Response data is undefined');
                    done();
                },
            });

            const req = httpController.expectOne(
                request => request.url === '/api/articles/search'
            );
            req.flush({ success: false, error: 'Not found' });
        });

        it('should propagate HTTP 500 errors', done => {
            spectator.service.searchArticles('test').subscribe({
                error: err => {
                    expect(err.status).toBe(500);
                    done();
                },
            });

            const req = httpController.expectOne(
                request => request.url === '/api/articles/search'
            );
            req.flush('Server error', {
                status: 500,
                statusText: 'Internal Server Error',
            });
        });

        it('should propagate HTTP 404 errors', done => {
            spectator.service.searchArticles('test').subscribe({
                error: err => {
                    expect(err.status).toBe(404);
                    done();
                },
            });

            const req = httpController.expectOne(
                request => request.url === '/api/articles/search'
            );
            req.flush('Not found', {
                status: 404,
                statusText: 'Not Found',
            });
        });
    });
});
