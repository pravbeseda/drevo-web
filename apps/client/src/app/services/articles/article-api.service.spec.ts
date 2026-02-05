import { provideHttpClient } from '@angular/common/http';
import {
    HttpTestingController,
    provideHttpClientTesting,
} from '@angular/common/http/testing';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
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

    const createMockSearchResponse = (
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
        response = createMockSearchResponse()
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

    describe('getArticle', () => {
        const mockArticleResponse = {
            success: true,
            data: {
                articleId: 123,
                versionId: 456,
                title: 'Test Article',
                content: '<p>Content</p>',
                author: 'Author',
                date: '2024-01-15T10:00:00+00:00',
                redirect: 0,
            },
        };

        it('should call HTTP GET with correct URL', () => {
            spectator.service.getArticle(123).subscribe(result => {
                expect(result).toEqual(mockArticleResponse.data);
            });

            const req = httpController.expectOne('/api/articles/show/123');
            expect(req.request.method).toBe('GET');
            expect(req.request.withCredentials).toBe(true);
            req.flush(mockArticleResponse);
        });

        it('should extract data from response wrapper', done => {
            spectator.service.getArticle(456).subscribe(result => {
                expect(result.articleId).toBe(123);
                expect(result.title).toBe('Test Article');
                done();
            });

            const req = httpController.expectOne('/api/articles/show/456');
            req.flush(mockArticleResponse);
        });

        it('should throw when response.data is undefined', done => {
            spectator.service.getArticle(123).subscribe({
                error: (err: Error) => {
                    expect(err.message).toContain('Response data is undefined');
                    done();
                },
            });

            const req = httpController.expectOne('/api/articles/show/123');
            req.flush({ success: true, data: undefined });
        });

        it('should propagate HTTP 404 errors', done => {
            spectator.service.getArticle(999).subscribe({
                error: err => {
                    expect(err.status).toBe(404);
                    done();
                },
            });

            const req = httpController.expectOne('/api/articles/show/999');
            req.flush(
                { success: false, error: 'Article not found' },
                { status: 404, statusText: 'Not Found' }
            );
        });
    });

    describe('getArticleVersion', () => {
        const mockVersionResponse = {
            success: true,
            data: {
                articleId: 123,
                versionId: 789,
                title: 'Test Article Version',
                content: '<p>Raw content</p>',
                author: 'Version Author',
                date: '2024-02-20T15:30:00+00:00',
                redirect: 0,
                new: true,
                approved: 1,
                info: 'Version info',
                comment: 'Editor comment',
            },
        };

        it('should call HTTP GET with correct URL', () => {
            spectator.service.getArticleVersion(789).subscribe(result => {
                expect(result).toEqual(mockVersionResponse.data);
            });

            const req = httpController.expectOne('/api/articles/version/789');
            expect(req.request.method).toBe('GET');
            expect(req.request.withCredentials).toBe(true);
            req.flush(mockVersionResponse);
        });

        it('should extract data from response wrapper', done => {
            spectator.service.getArticleVersion(789).subscribe(result => {
                expect(result.articleId).toBe(123);
                expect(result.versionId).toBe(789);
                expect(result.title).toBe('Test Article Version');
                expect(result.new).toBe(true);
                expect(result.approved).toBe(1);
                expect(result.info).toBe('Version info');
                expect(result.comment).toBe('Editor comment');
                done();
            });

            const req = httpController.expectOne('/api/articles/version/789');
            req.flush(mockVersionResponse);
        });

        it('should throw when response.data is undefined', done => {
            spectator.service.getArticleVersion(789).subscribe({
                error: (err: Error) => {
                    expect(err.message).toContain('Response data is undefined');
                    done();
                },
            });

            const req = httpController.expectOne('/api/articles/version/789');
            req.flush({ success: true, data: undefined });
        });

        it('should propagate HTTP 404 errors', done => {
            spectator.service.getArticleVersion(999).subscribe({
                error: err => {
                    expect(err.status).toBe(404);
                    done();
                },
            });

            const req = httpController.expectOne('/api/articles/version/999');
            req.flush(
                { success: false, error: 'Version not found' },
                { status: 404, statusText: 'Not Found' }
            );
        });
    });

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
                createMockSearchResponse(mockData.items, 1, 25, 1)
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
            req.flush(createMockSearchResponse());
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
            req.flush(createMockSearchResponse());
        });
    });

    describe('saveArticleVersion', () => {
        const mockSaveResponse = {
            success: true,
            data: {
                articleId: 123,
                versionId: 999,
                title: 'Updated Article',
                content: 'New content',
                author: 'Editor',
                date: '2024-01-20T12:00:00+00:00',
                approved: 0,
            },
        };

        it('should call HTTP POST with correct URL and body', () => {
            const request = { versionId: 456, content: 'New content' };

            spectator.service.saveArticleVersion(request).subscribe(result => {
                expect(result).toEqual(mockSaveResponse.data);
            });

            const req = httpController.expectOne('/api/articles/save');
            expect(req.request.method).toBe('POST');
            expect(req.request.withCredentials).toBe(true);
            expect(req.request.body).toEqual(request);
            req.flush(mockSaveResponse);
        });

        it('should include optional info field in request body', () => {
            const request = {
                versionId: 456,
                content: 'New content',
                info: 'Version info',
            };

            spectator.service.saveArticleVersion(request).subscribe();

            const req = httpController.expectOne('/api/articles/save');
            expect(req.request.body).toEqual(request);
            req.flush(mockSaveResponse);
        });

        it('should extract data from response wrapper', done => {
            spectator.service
                .saveArticleVersion({ versionId: 456, content: 'New content' })
                .subscribe(result => {
                    expect(result.articleId).toBe(123);
                    expect(result.versionId).toBe(999);
                    expect(result.title).toBe('Updated Article');
                    expect(result.approved).toBe(0);
                    done();
                });

            const req = httpController.expectOne('/api/articles/save');
            req.flush(mockSaveResponse);
        });

        it('should throw when response.data is undefined', done => {
            spectator.service
                .saveArticleVersion({ versionId: 456, content: 'New content' })
                .subscribe({
                    error: (err: Error) => {
                        expect(err.message).toContain(
                            'Response data is undefined'
                        );
                        done();
                    },
                });

            const req = httpController.expectOne('/api/articles/save');
            req.flush({ success: true, data: undefined });
        });

        it('should propagate HTTP 401 errors', done => {
            spectator.service
                .saveArticleVersion({ versionId: 456, content: 'New content' })
                .subscribe({
                    error: err => {
                        expect(err.status).toBe(401);
                        done();
                    },
                });

            const req = httpController.expectOne('/api/articles/save');
            req.flush(
                { success: false, error: 'Unauthorized' },
                { status: 401, statusText: 'Unauthorized' }
            );
        });

        it('should propagate HTTP 403 errors', done => {
            spectator.service
                .saveArticleVersion({ versionId: 456, content: 'New content' })
                .subscribe({
                    error: err => {
                        expect(err.status).toBe(403);
                        done();
                    },
                });

            const req = httpController.expectOne('/api/articles/save');
            req.flush(
                { success: false, error: 'Forbidden' },
                { status: 403, statusText: 'Forbidden' }
            );
        });

        it('should propagate HTTP 500 errors', done => {
            spectator.service
                .saveArticleVersion({ versionId: 456, content: 'New content' })
                .subscribe({
                    error: err => {
                        expect(err.status).toBe(500);
                        done();
                    },
                });

            const req = httpController.expectOne('/api/articles/save');
            req.flush('Server error', {
                status: 500,
                statusText: 'Internal Server Error',
            });
        });
    });

    describe('getArticlesHistory', () => {
        const mockHistoryResponse = {
            success: true,
            data: {
                items: [
                    {
                        versionId: 1,
                        articleId: 100,
                        title: 'Test',
                        author: 'Author',
                        date: '2025-01-15T14:30:00+00:00',
                        approved: 1,
                        new: false,
                        info: '',
                        comment: '',
                    },
                ],
                total: 1,
                page: 1,
                pageSize: 25,
                totalPages: 1,
            },
        };

        it('should call HTTP GET with correct URL and params', () => {
            spectator.service.getArticlesHistory(1, 25).subscribe(result => {
                expect(result).toEqual(mockHistoryResponse.data);
            });

            const req = httpController.expectOne(
                request =>
                    request.url === '/api/articles/history' &&
                    request.params.get('page') === '1' &&
                    request.params.get('size') === '25'
            );
            expect(req.request.method).toBe('GET');
            expect(req.request.withCredentials).toBe(true);
            req.flush(mockHistoryResponse);
        });

        it('should include approved param when provided', () => {
            spectator.service.getArticlesHistory(1, 25, 0).subscribe();

            const req = httpController.expectOne(
                request =>
                    request.url === '/api/articles/history' &&
                    request.params.get('approved') === '0'
            );
            req.flush(mockHistoryResponse);
        });

        it('should include author param when provided', () => {
            spectator.service
                .getArticlesHistory(1, 25, undefined, 'testuser')
                .subscribe();

            const req = httpController.expectOne(
                request =>
                    request.url === '/api/articles/history' &&
                    request.params.get('author') === 'testuser'
            );
            req.flush(mockHistoryResponse);
        });

        it('should not include approved param when undefined', () => {
            spectator.service.getArticlesHistory(1, 25).subscribe();

            const req = httpController.expectOne(
                request =>
                    request.url === '/api/articles/history' &&
                    !request.params.has('approved')
            );
            req.flush(mockHistoryResponse);
        });

        it('should extract data from response wrapper', done => {
            spectator.service.getArticlesHistory(1, 25).subscribe(result => {
                expect(result.items).toHaveLength(1);
                expect(result.total).toBe(1);
                done();
            });

            const req = httpController.expectOne(
                request => request.url === '/api/articles/history'
            );
            req.flush(mockHistoryResponse);
        });

        it('should throw when response.data is undefined', done => {
            spectator.service.getArticlesHistory(1, 25).subscribe({
                error: (err: Error) => {
                    expect(err.message).toContain('Response data is undefined');
                    done();
                },
            });

            const req = httpController.expectOne(
                request => request.url === '/api/articles/history'
            );
            req.flush({ success: true, data: undefined });
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
