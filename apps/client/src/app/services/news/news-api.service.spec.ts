import { NewsApiService } from './news-api.service';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SpectatorService, createServiceFactory } from '@ngneat/spectator/jest';
import { SKIP_ERROR_NOTIFICATION } from '@drevo-web/core';
import { NewsTopicDto } from '@drevo-web/shared';

describe('NewsApiService', () => {
    let spectator: SpectatorService<NewsApiService>;
    let httpController: HttpTestingController;

    const createService = createServiceFactory({
        service: NewsApiService,
        providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    beforeEach(() => {
        spectator = createService();
        httpController = spectator.inject(HttpTestingController);
    });

    afterEach(() => httpController.verify());

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
