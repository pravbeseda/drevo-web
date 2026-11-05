import { NewsApiService } from './news-api.service';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SpectatorService, createServiceFactory } from '@ngneat/spectator/jest';
import { SKIP_ERROR_NOTIFICATION } from '@drevo-web/core';
import { NewsFeedResponseDto, NewsTopicDto } from '@drevo-web/shared';

describe('NewsApiService', () => {
    let spectator: SpectatorService<NewsApiService>;
    let httpController: HttpTestingController;

    const createService = createServiceFactory({
        service: NewsApiService,
        providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    const feed: NewsFeedResponseDto = {
        items: [{ id: 7, title: 'Новость', newsDate: '2026-11-04', topics: [3], rank: 0 }],
        total: 1,
        page: 1,
        pageSize: 25,
        totalPages: 1,
    };

    beforeEach(() => {
        spectator = createService();
        httpController = spectator.inject(HttpTestingController);
    });

    afterEach(() => httpController.verify());

    describe('getFeed', () => {
        it('reads a page of the feed of every section', done => {
            spectator.service.getFeed(undefined, 2, 25).subscribe(result => {
                expect(result).toEqual(feed);
                done();
            });

            const req = httpController.expectOne(request => request.url === '/api/news/list');
            expect(req.request.withCredentials).toBe(true);
            expect(req.request.params.get('page')).toBe('2');
            expect(req.request.params.get('size')).toBe('25');
            expect(req.request.params.has('topic')).toBe(false);
            req.flush({ success: true, data: feed });
        });

        it('narrows the feed to one section', () => {
            spectator.service.getFeed(3, 1, 25).subscribe();

            const req = httpController.expectOne(request => request.url === '/api/news/list');
            expect(req.request.params.get('topic')).toBe('3');
            req.flush({ success: true, data: feed });
        });
    });

    describe('getTopics', () => {
        it('reads the news sections', done => {
            const topics: readonly NewsTopicDto[] = [{ id: 3, title: 'Церковь' }];

            spectator.service.getTopics().subscribe(result => {
                expect(result).toEqual(topics);
                done();
            });

            const req = httpController.expectOne('/api/news/topics');
            expect(req.request.withCredentials).toBe(true);
            req.flush({ success: true, data: topics });
        });
    });

    describe('createNews', () => {
        it('creates a news item, leaving its errors to the form', done => {
            const request = { title: 'Новость', newsDate: '2026-11-05', topic: 3, content: 'Текст' };
            const created = { articleId: 7, versionId: 70, title: 'Новость', author: 'a', date: 'd', approved: 0 };

            spectator.service.createNews(request).subscribe(result => {
                expect(result).toEqual(created);
                done();
            });

            const req = httpController.expectOne('/api/news/create');
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual(request);
            expect(req.request.withCredentials).toBe(true);
            expect(req.request.context.get(SKIP_ERROR_NOTIFICATION)).toBe(true);
            req.flush({ success: true, data: created });
        });
    });

    describe('updateMeta', () => {
        it('changes the meta of a news item, leaving its errors to the form', done => {
            const meta = { articleId: 7, title: 'Новость', newsDate: '2026-11-05', topics: [3], rank: 4, numlist: 0 };

            spectator.service.updateMeta(7, { rank: 4 }).subscribe(result => {
                expect(result).toEqual(meta);
                done();
            });

            const req = httpController.expectOne('/api/news/7/meta');
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({ rank: 4 });
            expect(req.request.context.get(SKIP_ERROR_NOTIFICATION)).toBe(true);
            req.flush({ success: true, data: meta });
        });
    });
});
