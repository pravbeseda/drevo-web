import { ForumApiService } from './forum-api.service';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SpectatorService, createServiceFactory } from '@ngneat/spectator/jest';
import { SKIP_ERROR_FOR_STATUSES } from '@drevo-web/core';
import {
    ForumCreatedTopicDto,
    ForumPostedMessageDto,
    ForumSectionDto,
    ForumTopicListResponseDto,
    ForumTopicPageDto,
} from '@drevo-web/shared';

describe('ForumApiService', () => {
    let spectator: SpectatorService<ForumApiService>;
    let httpController: HttpTestingController;

    const createService = createServiceFactory({
        service: ForumApiService,
        providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    const sections: readonly ForumSectionDto[] = [
        { id: 'common', name: 'Общий', description: 'Общие вопросы' },
        { id: 'articles', name: 'Статьи', description: 'Обсуждение статей' },
    ];

    const topicList: ForumTopicListResponseDto = {
        items: [
            {
                id: 42,
                title: 'Тема',
                author: 'Иван Иванов',
                createdAt: '2026-01-02T03:04:05+03:00',
                repliesCount: 3,
                lastPostId: 99,
                lastPostAt: '2026-01-03T03:04:05+03:00',
                pinned: false,
                article: null,
                section: { id: 'common', name: 'Общий' },
            },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
    };

    const topicPage: ForumTopicPageDto = {
        topic: {
            id: 42,
            title: 'Тема',
            part: 'common',
            partId: 0,
            article: null,
            author: 'Иван Иванов',
            createdAt: '2026-01-02T03:04:05+03:00',
            repliesCount: 1,
        },
        messages: {
            items: [
                {
                    id: 99,
                    parentId: 42,
                    author: { name: 'Иван Иванов', login: 'ivan' },
                    createdAt: '2026-01-03T03:04:05+03:00',
                    html: '<p>Текст</p>',
                },
            ],
            total: 1,
            page: 1,
            pageSize: 20,
            totalPages: 1,
        },
    };

    beforeEach(() => {
        spectator = createService();
        httpController = spectator.inject(HttpTestingController);
    });

    afterEach(() => {
        httpController.verify();
    });

    describe('getSections', () => {
        it('should call GET /api/forum/sections and unwrap data', () => {
            let result: readonly ForumSectionDto[] | undefined;
            spectator.service.getSections().subscribe(dto => (result = dto));

            const req = httpController.expectOne('/api/forum/sections');
            expect(req.request.method).toBe('GET');
            expect(req.request.withCredentials).toBe(true);
            req.flush({ success: true, data: sections });

            expect(result).toEqual(sections);
        });

        it('should fail when the envelope carries no data', () => {
            let error: Error | undefined;
            spectator.service.getSections().subscribe({ error: (err: unknown) => (error = err as Error) });

            httpController.expectOne('/api/forum/sections').flush({ success: true });

            expect(error?.message).toContain('Response data is undefined');
        });
    });

    describe('getTopics', () => {
        it('should send part, partId and page when given', () => {
            let result: ForumTopicListResponseDto | undefined;
            spectator.service.getTopics('articles', 1234, 2).subscribe(dto => (result = dto));

            const req = httpController.expectOne('/api/forum/topics?part=articles&partId=1234&page=2');
            expect(req.request.method).toBe('GET');
            expect(req.request.withCredentials).toBe(true);
            req.flush({ success: true, data: topicList });

            expect(result).toEqual(topicList);
        });

        it('should send no query at all when nothing is given', () => {
            spectator.service.getTopics().subscribe();

            const req = httpController.expectOne('/api/forum/topics');
            req.flush({ success: true, data: topicList });
        });

        it('should omit an empty part and a partId of zero rather than send them empty', () => {
            spectator.service.getTopics('', 0, 3).subscribe();

            const req = httpController.expectOne('/api/forum/topics?page=3');
            req.flush({ success: true, data: topicList });
        });
    });

    describe('getTopic', () => {
        it('should call GET /api/forum/topics/<id> with page and anchor and unwrap data', () => {
            let result: ForumTopicPageDto | undefined;
            spectator.service.getTopic(42, 2, 99).subscribe(dto => (result = dto));

            const req = httpController.expectOne('/api/forum/topics/42?page=2&anchor=99');
            expect(req.request.method).toBe('GET');
            expect(req.request.withCredentials).toBe(true);
            req.flush({ success: true, data: topicPage });

            expect(result).toEqual(topicPage);
        });

        it('should send no query at all when neither page nor anchor is given', () => {
            spectator.service.getTopic(42).subscribe();

            const req = httpController.expectOne('/api/forum/topics/42');
            req.flush({ success: true, data: topicPage });
        });

        it('should send the anchor alone when there is no page', () => {
            spectator.service.getTopic(42, undefined, 99).subscribe();

            const req = httpController.expectOne('/api/forum/topics/42?anchor=99');
            req.flush({ success: true, data: topicPage });
        });
    });

    describe('createTopic', () => {
        const created: ForumCreatedTopicDto = {
            topicId: 43,
            message: topicPage.messages.items[0],
            approved: true,
        };

        it('should POST the request to /api/forum/topics and unwrap data', () => {
            let result: ForumCreatedTopicDto | undefined;
            spectator.service
                .createTopic({ part: 'articles', partId: 7, title: 'Тема', text: 'Текст' })
                .subscribe(dto => (result = dto));

            const req = httpController.expectOne('/api/forum/topics');
            expect(req.request.method).toBe('POST');
            expect(req.request.withCredentials).toBe(true);
            expect(req.request.body).toEqual({ part: 'articles', partId: 7, title: 'Тема', text: 'Текст' });
            req.flush({ success: true, data: created });

            expect(result).toEqual(created);
        });

        it('should leave a refused post to the caller rather than to the error toast', () => {
            spectator.service.createTopic({ part: 'common', title: 'Тема', text: 'Текст' }).subscribe();

            const req = httpController.expectOne('/api/forum/topics');
            expect(req.request.context.get(SKIP_ERROR_FOR_STATUSES)).toEqual([400, 403]);
            req.flush({ success: true, data: created });
        });
    });

    describe('reply', () => {
        const posted: ForumPostedMessageDto = { message: topicPage.messages.items[0], approved: false };

        it('should POST the text and the parent to /api/forum/topics/<id>/messages and unwrap data', () => {
            let result: ForumPostedMessageDto | undefined;
            spectator.service.reply(42, { text: 'Ответ', parentId: 99 }).subscribe(dto => (result = dto));

            const req = httpController.expectOne('/api/forum/topics/42/messages');
            expect(req.request.method).toBe('POST');
            expect(req.request.withCredentials).toBe(true);
            expect(req.request.body).toEqual({ text: 'Ответ', parentId: 99 });
            expect(req.request.context.get(SKIP_ERROR_FOR_STATUSES)).toEqual([400, 403]);
            req.flush({ success: true, data: posted });

            expect(result).toEqual(posted);
        });
    });
});
