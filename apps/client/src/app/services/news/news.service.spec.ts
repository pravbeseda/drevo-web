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
