import { ForumApiService } from './forum-api.service';
import { ForumService } from './forum.service';
import { HttpErrorResponse } from '@angular/common/http';
import { SpectatorService, createServiceFactory } from '@ngneat/spectator/jest';
import {
    ForumCreatedTopic,
    ForumPostedMessage,
    ForumPostOutcome,
    ForumSectionDto,
    ForumTopicListItemDto,
    ForumTopicListResponseDto,
    ForumTopicPageDto,
} from '@drevo-web/shared';
import { of, throwError } from 'rxjs';

describe('ForumService', () => {
    let spectator: SpectatorService<ForumService>;
    let forumApiService: jest.Mocked<ForumApiService>;

    const createService = createServiceFactory({
        service: ForumService,
        mocks: [ForumApiService],
    });

    beforeEach(() => {
        spectator = createService();
        forumApiService = spectator.inject(ForumApiService);
    });

    const sections: readonly ForumSectionDto[] = [{ id: 'common', name: 'Общий', description: 'Общие вопросы' }];

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
                pinned: true,
                lastAuthor: 'Пётр Петров',
                article: { id: 15, title: 'Статья' },
                section: { id: 'articles', name: 'О статьях' },
            },
        ],
        total: 7,
        page: 2,
        pageSize: 20,
        totalPages: 4,
    };

    const topicPage: ForumTopicPageDto = {
        topic: {
            id: 42,
            title: 'Тема',
            part: 'articles',
            partId: 15,
            article: { id: 15, title: 'Статья' },
            author: 'Иван Иванов',
            createdAt: '2026-01-02T03:04:05+03:00',
            repliesCount: 1,
        },
        messages: {
            items: [
                {
                    id: 99,
                    parentId: 98,
                    author: { name: 'Иван Иванов', login: 'ivan' },
                    createdAt: '2026-01-03T03:04:05+03:00',
                    html: '<p>Текст</p>',
                },
            ],
            total: 5,
            page: 3,
            pageSize: 10,
            totalPages: 2,
        },
    };

    describe('getSections', () => {
        it('should return the sections of the API layer', done => {
            forumApiService.getSections.mockReturnValue(of(sections));

            spectator.service.getSections().subscribe(result => {
                expect(result).toStrictEqual([{ id: 'common', name: 'Общий', description: 'Общие вопросы' }]);
                done();
            });
        });
    });

    describe('getTopics', () => {
        it('should pass the params to the API layer', () => {
            forumApiService.getTopics.mockReturnValue(of(topicList));

            spectator.service.getTopics('articles', 15, 2).subscribe();

            expect(forumApiService.getTopics).toHaveBeenCalledWith('articles', 15, 2);
        });

        it('should map dates and carry the pagination through unchanged', done => {
            forumApiService.getTopics.mockReturnValue(of(topicList));

            spectator.service.getTopics().subscribe(result => {
                expect(result).toStrictEqual({
                    items: [
                        {
                            id: 42,
                            title: 'Тема',
                            lastPostAt: new Date('2026-01-03T03:04:05+03:00'),
                            pinned: true,
                            author: 'Иван Иванов',
                            article: { id: 15, title: 'Статья' },
                            section: { id: 'articles', name: 'О статьях' },
                        },
                    ],
                    total: 7,
                    page: 2,
                    pageSize: 20,
                    totalPages: 4,
                });
                done();
            });
        });

        it('should map a missing date, a missing article and section to undefined', done => {
            const bareItem: ForumTopicListItemDto = {
                id: 42,
                title: 'Тема',
                author: 'Иван Иванов',
                createdAt: null,
                repliesCount: 3,
                lastPostId: 0,
                lastPostAt: null,
                pinned: false,
                article: null,
                section: null,
            };
            forumApiService.getTopics.mockReturnValue(of({ ...topicList, items: [bareItem] }));

            spectator.service.getTopics().subscribe(result => {
                expect(result.items[0]).toStrictEqual({
                    id: 42,
                    title: 'Тема',
                    lastPostAt: undefined,
                    pinned: false,
                    author: 'Иван Иванов',
                    article: undefined,
                    section: undefined,
                });
                done();
            });
        });
    });

    describe('getTopic', () => {
        it('should pass the params to the API layer', () => {
            forumApiService.getTopic.mockReturnValue(of(topicPage));

            spectator.service.getTopic(42, 3, 99).subscribe();

            expect(forumApiService.getTopic).toHaveBeenCalledWith(42, 3, 99);
        });

        it('should map the topic and its messages', done => {
            forumApiService.getTopic.mockReturnValue(of(topicPage));

            spectator.service.getTopic(42).subscribe(result => {
                expect(result).toStrictEqual({
                    topic: {
                        id: 42,
                        title: 'Тема',
                        part: 'articles',
                        partId: 15,
                        article: { id: 15, title: 'Статья' },
                        author: 'Иван Иванов',
                        createdAt: new Date('2026-01-02T03:04:05+03:00'),
                        repliesCount: 1,
                    },
                    messages: {
                        items: [
                            {
                                id: 99,
                                parentId: 98,
                                author: { name: 'Иван Иванов', login: 'ivan' },
                                createdAt: new Date('2026-01-03T03:04:05+03:00'),
                                html: '<p>Текст</p>',
                            },
                        ],
                        total: 5,
                        page: 3,
                        pageSize: 10,
                        totalPages: 2,
                    },
                });
                done();
            });
        });

        it('should map the partId sentinel, a missing article and a missing date to undefined', done => {
            forumApiService.getTopic.mockReturnValue(
                of({
                    ...topicPage,
                    topic: { ...topicPage.topic, partId: 0, article: null, createdAt: null },
                }),
            );

            spectator.service.getTopic(42).subscribe(result => {
                expect(result.topic).toStrictEqual({
                    id: 42,
                    title: 'Тема',
                    part: 'articles',
                    partId: undefined,
                    article: undefined,
                    author: 'Иван Иванов',
                    createdAt: undefined,
                    repliesCount: 1,
                });
                done();
            });
        });

        it('should map the parentId sentinel, a missing login and a missing date to undefined', done => {
            forumApiService.getTopic.mockReturnValue(
                of({
                    ...topicPage,
                    messages: {
                        ...topicPage.messages,
                        items: [
                            {
                                id: 99,
                                parentId: 0,
                                author: { name: 'Гость' },
                                createdAt: null,
                                html: '<p>Текст</p>',
                            },
                        ],
                    },
                }),
            );

            spectator.service.getTopic(42).subscribe(result => {
                expect(result.messages.items[0]).toStrictEqual({
                    id: 99,
                    parentId: undefined,
                    author: { name: 'Гость', login: undefined },
                    createdAt: undefined,
                    html: '<p>Текст</p>',
                });
                done();
            });
        });
    });

    describe('posting', () => {
        const messageDto = {
            id: 100,
            parentId: 99,
            author: { name: 'Иван Иванов', login: 'ivan' },
            createdAt: '2026-01-03T03:04:05+03:00',
            html: '<p>Ответ</p>',
        };

        function validationFailure(body: unknown): HttpErrorResponse {
            return new HttpErrorResponse({ status: 400, error: body });
        }

        it('should start a topic, leaving out a partId there is none of, and map what was posted', () => {
            forumApiService.createTopic.mockReturnValue(of({ topicId: 43, message: messageDto, approved: true }));
            let outcome: ForumPostOutcome<ForumCreatedTopic> | undefined;

            spectator.service
                .createTopic({ part: 'common', partId: undefined, title: 'Тема', text: 'Текст' })
                .subscribe(result => (outcome = result));

            expect(forumApiService.createTopic).toHaveBeenCalledWith({ part: 'common', title: 'Тема', text: 'Текст' });
            expect(outcome).toEqual({
                status: 'posted',
                result: {
                    topicId: 43,
                    approved: true,
                    message: {
                        id: 100,
                        parentId: 99,
                        author: { name: 'Иван Иванов', login: 'ivan' },
                        createdAt: new Date('2026-01-03T03:04:05+03:00'),
                        html: '<p>Ответ</p>',
                    },
                },
            });
        });

        it('should send the partId of a topic bound to an article', () => {
            forumApiService.createTopic.mockReturnValue(of({ topicId: 43, message: messageDto, approved: false }));

            spectator.service.createTopic({ part: 'articles', partId: 15, title: 'Тема', text: 'Текст' }).subscribe();

            expect(forumApiService.createTopic).toHaveBeenCalledWith({
                part: 'articles',
                partId: 15,
                title: 'Тема',
                text: 'Текст',
            });
        });

        it('should reply to a message and map what was posted', () => {
            forumApiService.reply.mockReturnValue(of({ message: messageDto, approved: false }));
            let outcome: ForumPostOutcome<ForumPostedMessage> | undefined;

            spectator.service.reply(42, 'Ответ', 99).subscribe(result => (outcome = result));

            expect(forumApiService.reply).toHaveBeenCalledWith(42, { text: 'Ответ', parentId: 99 });
            expect(outcome).toEqual(expect.objectContaining({ status: 'posted' }));
            expect(outcome?.status === 'posted' && outcome.result.approved).toBe(false);
        });

        it('should reply to the topic itself when no message is answered', () => {
            forumApiService.reply.mockReturnValue(of({ message: messageDto, approved: true }));

            spectator.service.reply(42, 'Ответ', undefined).subscribe();

            expect(forumApiService.reply).toHaveBeenCalledWith(42, { text: 'Ответ' });
        });

        it('should turn a validation failure into the first message of each field', () => {
            forumApiService.reply.mockReturnValue(
                throwError(() =>
                    validationFailure({
                        success: false,
                        error: 'Излишнее цитирование!',
                        errorCode: 'VALIDATION_ERROR',
                        data: {
                            errors: {
                                text: ['Излишнее цитирование!', 'Второе'],
                                title: ['Заполните заголовок'],
                                f_author: ['Неизвестный автор'],
                            },
                        },
                    }),
                ),
            );
            let outcome: ForumPostOutcome<ForumPostedMessage> | undefined;

            spectator.service.reply(42, '> цитата', 99).subscribe(result => (outcome = result));

            expect(outcome).toEqual({
                status: 'rejected',
                errors: { title: 'Заполните заголовок', text: 'Излишнее цитирование!', other: 'Неизвестный автор' },
            });
        });

        it('should report a refused request the fields do not explain through its message', () => {
            forumApiService.createTopic.mockReturnValue(
                throwError(() =>
                    validationFailure({ success: false, error: 'Unknown forum section', errorCode: 'INVALID_PART' }),
                ),
            );
            let outcome: ForumPostOutcome<ForumCreatedTopic> | undefined;

            spectator.service
                .createTopic({ part: 'nope', partId: undefined, title: 'Тема', text: 'Текст' })
                .subscribe(result => (outcome = result));

            expect(outcome).toEqual({
                status: 'rejected',
                errors: { title: undefined, text: undefined, other: 'Unknown forum section' },
            });
        });

        it('should explain a refusal of a restricted account under the form', () => {
            forumApiService.reply.mockReturnValue(
                throwError(() => new HttpErrorResponse({ status: 403, error: { errorCode: 'FORBIDDEN' } })),
            );
            let outcome: ForumPostOutcome<ForumPostedMessage> | undefined;

            spectator.service.reply(42, 'Ответ', undefined).subscribe(result => (outcome = result));

            expect(outcome).toEqual({
                status: 'rejected',
                errors: { title: undefined, text: undefined, other: 'Ваш аккаунт ограничен: писать на форуме нельзя.' },
            });
        });

        it('should not take a 403 of another cause for a restricted account', () => {
            forumApiService.reply.mockReturnValue(
                throwError(
                    () => new HttpErrorResponse({ status: 403, error: { errorCode: 'CSRF_VALIDATION_FAILED' } }),
                ),
            );
            let outcome: ForumPostOutcome<ForumPostedMessage> | undefined;

            spectator.service.reply(42, 'Ответ', undefined).subscribe(result => (outcome = result));

            expect(outcome).toEqual({
                status: 'rejected',
                errors: {
                    title: undefined,
                    text: undefined,
                    other: 'Не удалось отправить. Обновите страницу и попробуйте снова.',
                },
            });
        });

        it('should pass any other failure on', () => {
            const failure = new HttpErrorResponse({ status: 500 });
            forumApiService.reply.mockReturnValue(throwError(() => failure));
            let error: unknown;

            spectator.service.reply(42, 'Ответ', undefined).subscribe({ error: (err: unknown) => (error = err) });

            expect(error).toBe(failure);
        });
    });
});
