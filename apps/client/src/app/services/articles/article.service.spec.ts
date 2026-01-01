import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { of } from 'rxjs';
import { ArticleSearchResponseApi } from '@drevo-web/shared';
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

    describe('searchArticles', () => {
        it('should call articleApiService.searchArticles with correct params', () => {
            const mockApiResponse: ArticleSearchResponseApi = {
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
            const mockApiResponse: ArticleSearchResponseApi = {
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
            const mockApiResponse: ArticleSearchResponseApi = {
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
            const mockApiResponse: ArticleSearchResponseApi = {
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
