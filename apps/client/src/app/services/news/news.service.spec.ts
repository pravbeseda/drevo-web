import { NewsApiService } from './news-api.service';
import { NewsService } from './news.service';
import { SpectatorService, createServiceFactory } from '@ngneat/spectator/jest';
import { of } from 'rxjs';

describe('NewsService', () => {
    let spectator: SpectatorService<NewsService>;
    let api: jest.Mocked<NewsApiService>;

    const createService = createServiceFactory({
        service: NewsService,
        mocks: [NewsApiService],
    });

    beforeEach(() => {
        spectator = createService();
        api = spectator.inject(NewsApiService);
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

    describe('getNewsList', () => {
        it('reads the first page of 25 by default and maps the days', done => {
            api.getNewsList.mockReturnValue(
                of({
                    items: [
                        { id: 5, title: 'Новость', newsDate: '2026-11-05', topics: [3], rank: 0 },
                        { id: 4, title: 'Без даты', newsDate: null, topics: [], rank: 0 },
                    ],
                    total: 2,
                    page: 1,
                    pageSize: 25,
                    totalPages: 1,
                }),
            );

            spectator.service.getNewsList({ articleId: 42 }).subscribe(result => {
                expect(api.getNewsList).toHaveBeenCalledWith({ articleId: 42 }, 1, 25);
                expect(result).toEqual({
                    items: [
                        { id: 5, title: 'Новость', newsDate: new Date(2026, 10, 5) },
                        { id: 4, title: 'Без даты', newsDate: undefined },
                    ],
                    total: 2,
                });
                done();
            });
        });

        it('reads the page it is asked for, of the source it is given', () => {
            api.getNewsList.mockReturnValue(of({ items: [], total: 0, page: 3, pageSize: 25, totalPages: 0 }));

            spectator.service.getNewsList({ title: 'НОВАЯ СТАТЬЯ' }, 3).subscribe();

            expect(api.getNewsList).toHaveBeenCalledWith({ title: 'НОВАЯ СТАТЬЯ' }, 3, 25);
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

            spectator.service.updateMeta(7, { topic: 3 }).subscribe(result => {
                expect(api.updateMeta).toHaveBeenCalledWith(7, { topic: 3 });
                expect(result).toEqual({
                    articleId: 7,
                    title: 'Новость',
                    newsDate: new Date(2026, 10, 5),
                    topics: [3],
                });
                done();
            });
        });
    });
});
