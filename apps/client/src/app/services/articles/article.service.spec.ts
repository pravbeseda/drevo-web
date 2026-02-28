import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { of, Subject } from 'rxjs';
import {
    ApprovalStatus,
    ArticleHistoryResponseDto,
    ArticleSearchResponseDto,
    ArticleVersionDto,
    ModerationResponseDto,
    SaveArticleVersionResponseDto,
    VersionPairsResponseDto,
} from '@drevo-web/shared';
import { ArticleApiService } from './article-api.service';
import { ArticleService } from './article.service';

describe('ArticleService', () => {
    let spectator: SpectatorService<ArticleService>;
    let articleApiService: jest.Mocked<ArticleApiService>;

    const createService = createServiceFactory({
        service: ArticleService,
        mocks: [ArticleApiService],
    });

    beforeEach(() => {
        spectator = createService();
        articleApiService = spectator.inject(ArticleApiService) as jest.Mocked<ArticleApiService>;
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
                expect(result.date.toISOString()).toBe('2024-01-15T10:00:00.000Z');
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
                content: '<a class="existlink" href="/articles/8.html">Link</a>',
            };
            articleApiService.getArticle.mockReturnValue(of(articleWithLinks));

            spectator.service.getArticle(123).subscribe(result => {
                expect(result.content).toBe('<a class="existlink" href="/articles/8">Link</a>');
                done();
            });
        });

        it('should transform multiple article links', done => {
            const articleWithLinks: ArticleVersionDto = {
                ...mockApiResponse,
                content: '<p><a href="/articles/1.html">First</a> and <a href="/articles/999.html">Second</a></p>',
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
                content: '<a href="https://example.com">External</a> <a href="/other/page.html">Other</a>',
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
                expect(result.content).toBe('<a href="/articles/8#S22">Link with anchor</a>');
                done();
            });
        });

        it('should deduplicate concurrent requests for the same article (in-flight cache)', () => {
            const apiSubject = new Subject<ArticleVersionDto>();
            articleApiService.getArticle.mockReturnValue(apiSubject.asObservable());

            const results: unknown[] = [];
            spectator.service.getArticle(123).subscribe(r => results.push(r));
            spectator.service.getArticle(123).subscribe(r => results.push(r));

            expect(articleApiService.getArticle).toHaveBeenCalledTimes(1);

            apiSubject.next(mockApiResponse);
            apiSubject.complete();

            expect(results).toHaveLength(2);
            expect(results[0]).toEqual(results[1]);
        });

        it('should allow new request after previous one completes', () => {
            articleApiService.getArticle.mockReturnValue(of(mockApiResponse));

            spectator.service.getArticle(123).subscribe();
            spectator.service.getArticle(123).subscribe();

            expect(articleApiService.getArticle).toHaveBeenCalledTimes(2);
        });

        it('should not share cache between different article IDs', () => {
            const subject1 = new Subject<ArticleVersionDto>();
            const subject2 = new Subject<ArticleVersionDto>();
            articleApiService.getArticle.mockReturnValueOnce(subject1.asObservable());
            articleApiService.getArticle.mockReturnValueOnce(subject2.asObservable());

            spectator.service.getArticle(123).subscribe();
            spectator.service.getArticle(456).subscribe();

            expect(articleApiService.getArticle).toHaveBeenCalledTimes(2);
            expect(articleApiService.getArticle).toHaveBeenCalledWith(123);
            expect(articleApiService.getArticle).toHaveBeenCalledWith(456);
        });
    });

    describe('getVersionShow', () => {
        const mockApiResponse: ArticleVersionDto = {
            articleId: 123,
            versionId: 789,
            title: 'Test Version',
            content: '<p>Content with <a href="/articles/8.html">link</a></p>',
            author: 'Version Author',
            date: '2024-02-20T15:30:00+00:00',
            redirect: 0,
            new: true,
            approved: 1,
            info: 'Version info text',
            comment: 'Editor comment',
        };

        it('should call articleApiService.getVersionShow with correct versionId', () => {
            articleApiService.getVersionShow.mockReturnValue(of(mockApiResponse));

            spectator.service.getVersionShow(789).subscribe();

            expect(articleApiService.getVersionShow).toHaveBeenCalledWith(789);
        });

        it('should map API response to frontend model', done => {
            articleApiService.getVersionShow.mockReturnValue(of(mockApiResponse));

            spectator.service.getVersionShow(789).subscribe(result => {
                expect(result.articleId).toBe(123);
                expect(result.versionId).toBe(789);
                expect(result.title).toBe('Test Version');
                expect(result.author).toBe('Version Author');
                expect(result.redirect).toBe(false);
                expect(result.new).toBe(true);
                expect(result.approved).toBe(1);
                expect(result.info).toBe('Version info text');
                expect(result.comment).toBe('Editor comment');
                done();
            });
        });

        it('should transform article links (like getArticle)', done => {
            articleApiService.getVersionShow.mockReturnValue(of(mockApiResponse));

            spectator.service.getVersionShow(789).subscribe(result => {
                expect(result.content).toBe('<p>Content with <a href="/articles/8">link</a></p>');
                done();
            });
        });

        it('should convert date string to Date object', done => {
            articleApiService.getVersionShow.mockReturnValue(of(mockApiResponse));

            spectator.service.getVersionShow(789).subscribe(result => {
                expect(result.date).toBeInstanceOf(Date);
                expect(result.date.toISOString()).toBe('2024-02-20T15:30:00.000Z');
                done();
            });
        });
    });

    describe('getArticleVersion', () => {
        const mockApiResponse: ArticleVersionDto = {
            articleId: 123,
            versionId: 789,
            title: 'Test Article Version',
            content: '<p>Raw content with <a href="/articles/8.html">link</a></p>',
            author: 'Version Author',
            date: '2024-02-20T15:30:00+00:00',
            redirect: 0,
            new: true,
            approved: 1,
            info: 'Version info text',
            comment: 'Editor comment',
        };

        it('should call articleApiService.getArticleVersion with correct versionId', () => {
            articleApiService.getArticleVersion.mockReturnValue(of(mockApiResponse));

            spectator.service.getArticleVersion(789).subscribe();

            expect(articleApiService.getArticleVersion).toHaveBeenCalledWith(789);
        });

        it('should map API response to frontend model', done => {
            articleApiService.getArticleVersion.mockReturnValue(of(mockApiResponse));

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
            articleApiService.getArticleVersion.mockReturnValue(of(mockApiResponse));

            spectator.service.getArticleVersion(789).subscribe(result => {
                expect(result.content).toBe('<p>Raw content with <a href="/articles/8.html">link</a></p>');
                done();
            });
        });

        it('should convert date string to Date object', done => {
            articleApiService.getArticleVersion.mockReturnValue(of(mockApiResponse));

            spectator.service.getArticleVersion(789).subscribe(result => {
                expect(result.date).toBeInstanceOf(Date);
                expect(result.date.toISOString()).toBe('2024-02-20T15:30:00.000Z');
                done();
            });
        });

        it('should map new field correctly', done => {
            articleApiService.getArticleVersion.mockReturnValue(of(mockApiResponse));

            spectator.service.getArticleVersion(789).subscribe(result => {
                expect(result.new).toBe(true);
                done();
            });
        });

        it('should map approved field correctly', done => {
            articleApiService.getArticleVersion.mockReturnValue(of(mockApiResponse));

            spectator.service.getArticleVersion(789).subscribe(result => {
                expect(result.approved).toBe(1);
                done();
            });
        });

        it('should map info field correctly', done => {
            articleApiService.getArticleVersion.mockReturnValue(of(mockApiResponse));

            spectator.service.getArticleVersion(789).subscribe(result => {
                expect(result.info).toBe('Version info text');
                done();
            });
        });

        it('should map comment field correctly', done => {
            articleApiService.getArticleVersion.mockReturnValue(of(mockApiResponse));

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
            articleApiService.getArticleVersion.mockReturnValue(of(redirectVersion));

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
            articleApiService.getArticleVersion.mockReturnValue(of(existingVersion));

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
            articleApiService.getArticleVersion.mockReturnValue(of(unapprovedVersion));

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
            articleApiService.searchArticles.mockReturnValue(of(mockApiResponse));

            spectator.service.searchArticles({ query: 'test' }).subscribe();

            expect(articleApiService.searchArticles).toHaveBeenCalledWith('test', 1, 25);
        });

        it('should use custom page and pageSize when provided', () => {
            const mockApiResponse: ArticleSearchResponseDto = {
                items: [],
                total: 0,
                page: 2,
                pageSize: 50,
                totalPages: 0,
            };
            articleApiService.searchArticles.mockReturnValue(of(mockApiResponse));

            spectator.service.searchArticles({ query: 'test', page: 2, pageSize: 50 }).subscribe();

            expect(articleApiService.searchArticles).toHaveBeenCalledWith('test', 2, 50);
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
            articleApiService.searchArticles.mockReturnValue(of(mockApiResponse));

            spectator.service.searchArticles({ query: 'test' }).subscribe(result => {
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
            articleApiService.searchArticles.mockReturnValue(of(mockApiResponse));

            spectator.service.searchArticles({ query: 'nonexistent' }).subscribe(result => {
                expect(result.items).toHaveLength(0);
                expect(result.total).toBe(0);
                done();
            });
        });
    });

    describe('saveArticleVersion', () => {
        const mockSaveResponse: SaveArticleVersionResponseDto = {
            articleId: 123,
            versionId: 999,
            title: 'Test Article',
            content: 'Updated content',
            author: 'Test Author',
            date: '2024-03-15T12:00:00+00:00',
            approved: 0,
        };

        it('should call articleApiService.saveArticleVersion with correct request', () => {
            articleApiService.saveArticleVersion.mockReturnValue(of(mockSaveResponse));

            spectator.service
                .saveArticleVersion({
                    versionId: 456,
                    content: 'New content',
                    info: 'Updated description',
                })
                .subscribe();

            expect(articleApiService.saveArticleVersion).toHaveBeenCalledWith({
                versionId: 456,
                content: 'New content',
                info: 'Updated description',
            });
        });

        it('should map API response to frontend model', done => {
            articleApiService.saveArticleVersion.mockReturnValue(of(mockSaveResponse));

            spectator.service
                .saveArticleVersion({
                    versionId: 456,
                    content: 'New content',
                })
                .subscribe(result => {
                    expect(result.articleId).toBe(123);
                    expect(result.versionId).toBe(999);
                    expect(result.title).toBe('Test Article');
                    expect(result.author).toBe('Test Author');
                    expect(result.approved).toBe(0);
                    done();
                });
        });

        it('should convert date string to Date object', done => {
            articleApiService.saveArticleVersion.mockReturnValue(of(mockSaveResponse));

            spectator.service
                .saveArticleVersion({
                    versionId: 456,
                    content: 'New content',
                })
                .subscribe(result => {
                    expect(result.date).toBeInstanceOf(Date);
                    expect(result.date.toISOString()).toBe('2024-03-15T12:00:00.000Z');
                    done();
                });
        });

        it('should handle approved=1 for moderators', done => {
            const moderatorResponse: SaveArticleVersionResponseDto = {
                ...mockSaveResponse,
                approved: 1,
            };
            articleApiService.saveArticleVersion.mockReturnValue(of(moderatorResponse));

            spectator.service
                .saveArticleVersion({
                    versionId: 456,
                    content: 'New content',
                })
                .subscribe(result => {
                    expect(result.approved).toBe(1);
                    done();
                });
        });

        it('should work without optional info field', () => {
            articleApiService.saveArticleVersion.mockReturnValue(of(mockSaveResponse));

            spectator.service
                .saveArticleVersion({
                    versionId: 456,
                    content: 'New content',
                })
                .subscribe();

            expect(articleApiService.saveArticleVersion).toHaveBeenCalledWith({
                versionId: 456,
                content: 'New content',
            });
        });
    });

    describe('moderateVersion', () => {
        const mockModerationResponse: ModerationResponseDto = {
            versionId: 200,
            articleId: 1,
            approved: 1,
            comment: 'Looks good',
        };

        it('should call articleApiService.moderateVersion with correct params', () => {
            articleApiService.moderateVersion.mockReturnValue(of(mockModerationResponse));

            spectator.service.moderateVersion(200, ApprovalStatus.Approved, 'Looks good').subscribe();

            expect(articleApiService.moderateVersion).toHaveBeenCalledWith({
                versionId: 200,
                approved: ApprovalStatus.Approved,
                comment: 'Looks good',
            });
        });

        it('should map DTO to ModerationResult', done => {
            articleApiService.moderateVersion.mockReturnValue(of(mockModerationResponse));

            spectator.service.moderateVersion(200, ApprovalStatus.Approved).subscribe(result => {
                expect(result.versionId).toBe(200);
                expect(result.articleId).toBe(1);
                expect(result.approved).toBe(ApprovalStatus.Approved);
                expect(result.comment).toBe('Looks good');
                done();
            });
        });

        it('should pass undefined comment when not provided', () => {
            articleApiService.moderateVersion.mockReturnValue(of(mockModerationResponse));

            spectator.service.moderateVersion(200, ApprovalStatus.Rejected).subscribe();

            expect(articleApiService.moderateVersion).toHaveBeenCalledWith({
                versionId: 200,
                approved: ApprovalStatus.Rejected,
                comment: undefined,
            });
        });
    });

    describe('getVersionPairs', () => {
        const mockVersionPairsResponse: VersionPairsResponseDto = {
            current: {
                articleId: 1,
                versionId: 10,
                content: 'Current content',
                author: 'Author A',
                date: '2025-03-10T12:00:00+00:00',
                title: 'Test Article',
                info: 'Updated intro',
                approved: 1,
                comment: 'Moderation note',
            },
            previous: {
                articleId: 1,
                versionId: 9,
                content: 'Previous content',
                author: 'Author B',
                date: '2025-03-09T10:00:00+00:00',
                title: 'Test Article',
                info: 'Initial version',
                approved: 1,
            },
        };

        it('should call articleApiService.getVersionPairs with version1', () => {
            articleApiService.getVersionPairs.mockReturnValue(of(mockVersionPairsResponse));

            spectator.service.getVersionPairs(10).subscribe();

            expect(articleApiService.getVersionPairs).toHaveBeenCalledWith(10, undefined);
        });

        it('should call articleApiService.getVersionPairs with both versions', () => {
            articleApiService.getVersionPairs.mockReturnValue(of(mockVersionPairsResponse));

            spectator.service.getVersionPairs(10, 9).subscribe();

            expect(articleApiService.getVersionPairs).toHaveBeenCalledWith(10, 9);
        });

        it('should convert date strings to Date objects', done => {
            articleApiService.getVersionPairs.mockReturnValue(of(mockVersionPairsResponse));

            spectator.service.getVersionPairs(10).subscribe(result => {
                expect(result.current.date).toBeInstanceOf(Date);
                expect(result.previous.date).toBeInstanceOf(Date);
                expect(result.current.date.toISOString()).toBe('2025-03-10T12:00:00.000Z');
                expect(result.previous.date.toISOString()).toBe('2025-03-09T10:00:00.000Z');
                done();
            });
        });

        it('should map all fields correctly', done => {
            articleApiService.getVersionPairs.mockReturnValue(of(mockVersionPairsResponse));

            spectator.service.getVersionPairs(10).subscribe(result => {
                expect(result.current.versionId).toBe(10);
                expect(result.current.content).toBe('Current content');
                expect(result.current.author).toBe('Author A');
                expect(result.current.title).toBe('Test Article');
                expect(result.current.info).toBe('Updated intro');
                expect(result.previous.versionId).toBe(9);
                expect(result.previous.content).toBe('Previous content');
                done();
            });
        });

        it('should map comment field when present', done => {
            articleApiService.getVersionPairs.mockReturnValue(of(mockVersionPairsResponse));

            spectator.service.getVersionPairs(10).subscribe(result => {
                expect(result.current.comment).toBe('Moderation note');
                expect(result.previous.comment).toBe('');
                done();
            });
        });
    });

    describe('getArticlesHistory', () => {
        const mockApiResponse: ArticleHistoryResponseDto = {
            items: [
                {
                    versionId: 1,
                    articleId: 100,
                    title: 'Test Article',
                    author: 'Author',
                    date: '2025-01-15T14:30:00+00:00',
                    approved: 1,
                    new: false,
                    info: 'some info',
                    comment: 'some comment',
                },
                {
                    versionId: 2,
                    articleId: 200,
                    title: 'New Article',
                    author: 'Author 2',
                    date: '2025-01-14T10:00:00+00:00',
                    approved: 0,
                    new: true,
                    info: '',
                    comment: '',
                },
            ],
            total: 50,
            page: 1,
            pageSize: 25,
            totalPages: 2,
        };

        it('should call articleApiService.getArticlesHistory with default params', () => {
            articleApiService.getArticlesHistory.mockReturnValue(of(mockApiResponse));

            spectator.service.getArticlesHistory({ page: 1 }).subscribe();

            expect(articleApiService.getArticlesHistory).toHaveBeenCalledWith(1, 25, undefined, undefined, undefined);
        });

        it('should pass custom params to API service', () => {
            articleApiService.getArticlesHistory.mockReturnValue(of(mockApiResponse));

            spectator.service
                .getArticlesHistory({
                    page: 2,
                    pageSize: 50,
                    approved: 0,
                    author: 'testuser',
                })
                .subscribe();

            expect(articleApiService.getArticlesHistory).toHaveBeenCalledWith(2, 50, 0, 'testuser', undefined);
        });

        it('should map API response to frontend model', done => {
            articleApiService.getArticlesHistory.mockReturnValue(of(mockApiResponse));

            spectator.service.getArticlesHistory({ page: 1 }).subscribe(result => {
                expect(result.total).toBe(50);
                expect(result.page).toBe(1);
                expect(result.pageSize).toBe(25);
                expect(result.totalPages).toBe(2);
                expect(result.items).toHaveLength(2);
                done();
            });
        });

        it('should convert date strings to Date objects', done => {
            articleApiService.getArticlesHistory.mockReturnValue(of(mockApiResponse));

            spectator.service.getArticlesHistory({ page: 1 }).subscribe(result => {
                expect(result.items[0].date).toBeInstanceOf(Date);
                expect(result.items[0].date.toISOString()).toBe('2025-01-15T14:30:00.000Z');
                done();
            });
        });

        it('should map "new" field to "isNew"', done => {
            articleApiService.getArticlesHistory.mockReturnValue(of(mockApiResponse));

            spectator.service.getArticlesHistory({ page: 1 }).subscribe(result => {
                expect(result.items[0].isNew).toBe(false);
                expect(result.items[1].isNew).toBe(true);
                done();
            });
        });

        it('should preserve approval status values', done => {
            articleApiService.getArticlesHistory.mockReturnValue(of(mockApiResponse));

            spectator.service.getArticlesHistory({ page: 1 }).subscribe(result => {
                expect(result.items[0].approved).toBe(1);
                expect(result.items[1].approved).toBe(0);
                done();
            });
        });
    });
});
