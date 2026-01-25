import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { of } from 'rxjs';
import { ArticleSearchResponseDto, ArticleVersionDto } from '@drevo-web/shared';
import { ArticleService } from './article.service';
import { ArticleApiService } from './article-api.service';

describe('ArticleService', () => {
    let spectator: SpectatorService<ArticleService>;
    let articleApiService: jest.Mocked<ArticleApiService>;

    const createService = createServiceFactory({
        service: ArticleService,
        mocks: [ArticleApiService],
    });

    beforeEach(() => {
        spectator = createService();
        articleApiService = spectator.inject(
            ArticleApiService
        ) as jest.Mocked<ArticleApiService>;
    });

    describe('getArticle', () => {
        const mockApiResponse: ArticleVersionDto = {
            articleId: 123,
            versionId: 456,
            title: 'Test Article',
            content: '<p>Content</p>',
            author: 'Test Author',
            date: '2024-01-15T10:00:00+00:00',
            redirect: 0,
        } as ArticleVersionDto;

        it('should call articleApiService.getArticle with correct id', () => {
            articleApiService.getArticle.mockReturnValue(of(mockApiResponse));

            spectator.service.getArticle(123).subscribe();

            expect(articleApiService.getArticle).toHaveBeenCalledWith(123);
        });

        it('should map API response to frontend model', done => {
            articleApiService.getArticle.mockReturnValue(of(mockApiResponse));

            spectator.service.getArticle(123).subscribe(result => {
                expect(result.articleId).toBe(123);
                expect(result.versionId).toBe(456);
                expect(result.title).toBe('Test Article');
                expect(result.content).toBe('<p>Content</p>');
                expect(result.author).toBe('Test Author');
                expect(result.redirect).toBe(false);
                done();
            });
        });

        it('should convert date string to Date object', done => {
            articleApiService.getArticle.mockReturnValue(of(mockApiResponse));

            spectator.service.getArticle(123).subscribe(result => {
                expect(result.date).toBeInstanceOf(Date);
                expect(result.date.toISOString()).toBe(
                    '2024-01-15T10:00:00.000Z'
                );
                done();
            });
        });

        it('should map redirect=1 to true', done => {
            const redirectArticle: ArticleVersionDto = {
                ...mockApiResponse,
                redirect: 1,
            };
            articleApiService.getArticle.mockReturnValue(of(redirectArticle));

            spectator.service.getArticle(123).subscribe(result => {
                expect(result.redirect).toBe(true);
                done();
            });
        });

        it('should transform article links removing .html extension', done => {
            const articleWithLinks: ArticleVersionDto = {
                ...mockApiResponse,
                content:
                    '<a class="existlink" href="/articles/8.html">Link</a>',
            };
            articleApiService.getArticle.mockReturnValue(of(articleWithLinks));

            spectator.service.getArticle(123).subscribe(result => {
                expect(result.content).toBe(
                    '<a class="existlink" href="/articles/8">Link</a>'
                );
                done();
            });
        });

        it('should transform multiple article links', done => {
            const articleWithLinks: ArticleVersionDto = {
                ...mockApiResponse,
                content:
                    '<p><a href="/articles/1.html">First</a> and <a href="/articles/999.html">Second</a></p>',
            };
            articleApiService.getArticle.mockReturnValue(of(articleWithLinks));

            spectator.service.getArticle(123).subscribe(result => {
                expect(result.content).toBe(
                    '<p><a href="/articles/1">First</a> and <a href="/articles/999">Second</a></p>'
                );
                done();
            });
        });

        it('should not transform non-article links', done => {
            const articleWithLinks: ArticleVersionDto = {
                ...mockApiResponse,
                content:
                    '<a href="https://example.com">External</a> <a href="/other/page.html">Other</a>',
            };
            articleApiService.getArticle.mockReturnValue(of(articleWithLinks));

            spectator.service.getArticle(123).subscribe(result => {
                expect(result.content).toBe(
                    '<a href="https://example.com">External</a> <a href="/other/page.html">Other</a>'
                );
                done();
            });
        });

        it('should transform article links with anchor fragments', done => {
            const articleWithLinks: ArticleVersionDto = {
                ...mockApiResponse,
                content: '<a href="/articles/8.html#S22">Link with anchor</a>',
            };
            articleApiService.getArticle.mockReturnValue(of(articleWithLinks));

            spectator.service.getArticle(123).subscribe(result => {
                expect(result.content).toBe(
                    '<a href="/articles/8#S22">Link with anchor</a>'
                );
                done();
            });
        });
    });

    describe('getArticleVersion', () => {
        const mockApiResponse: ArticleVersionDto = {
            articleId: 123,
            versionId: 789,
            title: 'Test Article Version',
            content:
                '<p>Raw content with <a href="/articles/8.html">link</a></p>',
            author: 'Version Author',
            date: '2024-02-20T15:30:00+00:00',
            redirect: 0,
            new: true,
            approved: 1,
            info: 'Version info text',
            comment: 'Editor comment',
        };

        it('should call articleApiService.getArticleVersion with correct versionId', () => {
            articleApiService.getArticleVersion.mockReturnValue(
                of(mockApiResponse)
            );

            spectator.service.getArticleVersion(789).subscribe();

            expect(articleApiService.getArticleVersion).toHaveBeenCalledWith(
                789
            );
        });

        it('should map API response to frontend model', done => {
            articleApiService.getArticleVersion.mockReturnValue(
                of(mockApiResponse)
            );

            spectator.service.getArticleVersion(789).subscribe(result => {
                expect(result.articleId).toBe(123);
                expect(result.versionId).toBe(789);
                expect(result.title).toBe('Test Article Version');
                expect(result.author).toBe('Version Author');
                expect(result.redirect).toBe(false);
                done();
            });
        });

        it('should NOT transform article links (unlike getArticle)', done => {
            articleApiService.getArticleVersion.mockReturnValue(
                of(mockApiResponse)
            );

            spectator.service.getArticleVersion(789).subscribe(result => {
                expect(result.content).toBe(
                    '<p>Raw content with <a href="/articles/8.html">link</a></p>'
                );
                done();
            });
        });

        it('should convert date string to Date object', done => {
            articleApiService.getArticleVersion.mockReturnValue(
                of(mockApiResponse)
            );

            spectator.service.getArticleVersion(789).subscribe(result => {
                expect(result.date).toBeInstanceOf(Date);
                expect(result.date.toISOString()).toBe(
                    '2024-02-20T15:30:00.000Z'
                );
                done();
            });
        });

        it('should map new field correctly', done => {
            articleApiService.getArticleVersion.mockReturnValue(
                of(mockApiResponse)
            );

            spectator.service.getArticleVersion(789).subscribe(result => {
                expect(result.new).toBe(true);
                done();
            });
        });

        it('should map approved field correctly', done => {
            articleApiService.getArticleVersion.mockReturnValue(
                of(mockApiResponse)
            );

            spectator.service.getArticleVersion(789).subscribe(result => {
                expect(result.approved).toBe(1);
                done();
            });
        });

        it('should map info field correctly', done => {
            articleApiService.getArticleVersion.mockReturnValue(
                of(mockApiResponse)
            );

            spectator.service.getArticleVersion(789).subscribe(result => {
                expect(result.info).toBe('Version info text');
                done();
            });
        });

        it('should map comment field correctly', done => {
            articleApiService.getArticleVersion.mockReturnValue(
                of(mockApiResponse)
            );

            spectator.service.getArticleVersion(789).subscribe(result => {
                expect(result.comment).toBe('Editor comment');
                done();
            });
        });

        it('should map redirect=1 to true', done => {
            const redirectVersion: ArticleVersionDto = {
                ...mockApiResponse,
                redirect: 1,
            };
            articleApiService.getArticleVersion.mockReturnValue(
                of(redirectVersion)
            );

            spectator.service.getArticleVersion(789).subscribe(result => {
                expect(result.redirect).toBe(true);
                done();
            });
        });

        it('should handle new=false correctly', done => {
            const existingVersion: ArticleVersionDto = {
                ...mockApiResponse,
                new: false,
            };
            articleApiService.getArticleVersion.mockReturnValue(
                of(existingVersion)
            );

            spectator.service.getArticleVersion(789).subscribe(result => {
                expect(result.new).toBe(false);
                done();
            });
        });

        it('should handle different approved values', done => {
            const unapprovedVersion: ArticleVersionDto = {
                ...mockApiResponse,
                approved: -1,
            };
            articleApiService.getArticleVersion.mockReturnValue(
                of(unapprovedVersion)
            );

            spectator.service.getArticleVersion(789).subscribe(result => {
                expect(result.approved).toBe(-1);
                done();
            });
        });
    });

    describe('searchArticles', () => {
        it('should call articleApiService.searchArticles with correct params', () => {
            const mockApiResponse: ArticleSearchResponseDto = {
                items: [{ id: 1, title: 'Test Article' }],
                total: 1,
                page: 1,
                pageSize: 25,
                totalPages: 1,
            };
            articleApiService.searchArticles.mockReturnValue(
                of(mockApiResponse)
            );

            spectator.service.searchArticles({ query: 'test' }).subscribe();

            expect(articleApiService.searchArticles).toHaveBeenCalledWith(
                'test',
                1,
                25
            );
        });

        it('should use custom page and pageSize when provided', () => {
            const mockApiResponse: ArticleSearchResponseDto = {
                items: [],
                total: 0,
                page: 2,
                pageSize: 50,
                totalPages: 0,
            };
            articleApiService.searchArticles.mockReturnValue(
                of(mockApiResponse)
            );

            spectator.service
                .searchArticles({ query: 'test', page: 2, pageSize: 50 })
                .subscribe();

            expect(articleApiService.searchArticles).toHaveBeenCalledWith(
                'test',
                2,
                50
            );
        });

        it('should map API response to frontend model', done => {
            const mockApiResponse: ArticleSearchResponseDto = {
                items: [
                    { id: 1, title: 'Article 1' },
                    { id: 2, title: 'Article 2' },
                ],
                total: 100,
                page: 1,
                pageSize: 25,
                totalPages: 4,
            };
            articleApiService.searchArticles.mockReturnValue(
                of(mockApiResponse)
            );

            spectator.service
                .searchArticles({ query: 'test' })
                .subscribe(result => {
                    expect(result).toEqual({
                        items: [
                            { id: 1, title: 'Article 1' },
                            { id: 2, title: 'Article 2' },
                        ],
                        total: 100,
                        page: 1,
                        pageSize: 25,
                        totalPages: 4,
                    });
                    done();
                });
        });

        it('should handle empty results', done => {
            const mockApiResponse: ArticleSearchResponseDto = {
                items: [],
                total: 0,
                page: 1,
                pageSize: 25,
                totalPages: 0,
            };
            articleApiService.searchArticles.mockReturnValue(
                of(mockApiResponse)
            );

            spectator.service
                .searchArticles({ query: 'nonexistent' })
                .subscribe(result => {
                    expect(result.items).toHaveLength(0);
                    expect(result.total).toBe(0);
                    done();
                });
        });
    });
});
