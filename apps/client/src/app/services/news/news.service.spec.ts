import { NewsApiService } from './news-api.service';
import { NewsService } from './news.service';
import { SpectatorService, createServiceFactory } from '@ngneat/spectator/jest';
import { NewsFeedResponseDto } from '@drevo-web/shared';
import { of } from 'rxjs';

describe('NewsService', () => {
    let spectator: SpectatorService<NewsService>;
    let api: jest.Mocked<NewsApiService>;

    const createService = createServiceFactory({
        service: NewsService,
        mocks: [NewsApiService],
    });

    const feed: NewsFeedResponseDto = {
        items: [
            { id: 7, title: 'Новость', newsDate: '2026-11-04', topics: [3], rank: 0 },
            // The backend sends `null` for a news item without a date.
            { id: 8, title: 'Без даты', newsDate: null, topics: [], rank: 0 },
        ],
        total: 30,
        page: 1,
        pageSize: 25,
        totalPages: 2,
    };

    beforeEach(() => {
        spectator = createService();
        api = spectator.inject(NewsApiService);
    });

    describe('getFeed', () => {
        it('reads the first page of every section by default', () => {
            api.getFeed.mockReturnValue(of(feed));

            spectator.service.getFeed().subscribe();

            expect(api.getFeed).toHaveBeenCalledWith(undefined, 1, 25);
        });

        it('passes the section and the page on', () => {
            api.getFeed.mockReturnValue(of(feed));

            spectator.service.getFeed({ topic: 3, page: 2 }).subscribe();

            expect(api.getFeed).toHaveBeenCalledWith(3, 2, 25);
        });

        it('maps the news dates as local calendar days', done => {
            api.getFeed.mockReturnValue(of(feed));

            spectator.service.getFeed().subscribe(result => {
                expect(result).toEqual({
                    items: [
                        { id: 7, title: 'Новость', newsDate: new Date(2026, 10, 4), topics: [3] },
                        { id: 8, title: 'Без даты', newsDate: undefined, topics: [] },
                    ],
                    total: 30,
                    page: 1,
                    totalPages: 2,
                });
                done();
            });
        });
    });

    describe('getTopics', () => {
        it('passes the sections through', done => {
            api.getTopics.mockReturnValue(of([{ id: 3, title: 'Церковь' }]));

            spectator.service.getTopics().subscribe(result => {
                expect(result).toEqual([{ id: 3, title: 'Церковь' }]);
                done();
            });
        });
    });

    describe('createNews', () => {
        it('creates a news item and maps the new version', done => {
            api.createNews.mockReturnValue(
                of({
                    articleId: 7,
                    versionId: 70,
                    title: 'Новость',
                    author: 'a',
                    date: '2026-11-05T10:00:00+00:00',
                    approved: 0,
                }),
            );
            const request = { title: 'Новость', newsDate: '2026-11-05', topic: 3, content: 'Текст', info: 'Новая' };

            spectator.service.createNews(request).subscribe(result => {
                expect(api.createNews).toHaveBeenCalledWith(request);
                expect(result).toEqual({
                    articleId: 7,
                    versionId: 70,
                    title: 'Новость',
                    author: 'a',
                    date: new Date('2026-11-05T10:00:00+00:00'),
                    approved: 0,
                });
                done();
            });
        });
    });

    describe('updateMeta', () => {
        it('changes the meta and maps what the news item now holds', done => {
            api.updateMeta.mockReturnValue(
                of({ articleId: 7, title: 'Новость', newsDate: '2026-11-05', topics: [3], rank: 4, numlist: 1 }),
            );

            spectator.service.updateMeta(7, { rank: 4, numlist: 1 }).subscribe(result => {
                expect(api.updateMeta).toHaveBeenCalledWith(7, { rank: 4, numlist: 1 });
                expect(result).toEqual({
                    articleId: 7,
                    title: 'Новость',
                    newsDate: new Date(2026, 10, 5),
                    topics: [3],
                    rank: 4,
                    numlist: 1,
                });
                done();
            });
        });
    });
});
