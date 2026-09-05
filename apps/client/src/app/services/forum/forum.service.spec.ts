import { ForumApiService } from './forum-api.service';
import { ForumService } from './forum.service';
import { SpectatorService, createServiceFactory } from '@ngneat/spectator/jest';
import { ForumSectionDto, ForumTopicListResponseDto, ForumTopicPageDto } from '@drevo-web/shared';
import { of } from 'rxjs';

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
                            author: 'Иван Иванов',
                            createdAt: new Date('2026-01-02T03:04:05+03:00'),
                            repliesCount: 3,
                            lastPostId: 99,
                            lastPostAt: new Date('2026-01-03T03:04:05+03:00'),
                            pinned: true,
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

        it('should map missing dates and the lastPostId sentinel to undefined', done => {
            forumApiService.getTopics.mockReturnValue(
                of({
                    ...topicList,
                    items: [{ ...topicList.items[0], createdAt: null, lastPostId: 0, lastPostAt: null, pinned: false }],
                }),
            );

            spectator.service.getTopics().subscribe(result => {
                expect(result.items[0]).toStrictEqual({
                    id: 42,
                    title: 'Тема',
                    author: 'Иван Иванов',
                    createdAt: undefined,
                    repliesCount: 3,
                    lastPostId: undefined,
                    lastPostAt: undefined,
                    pinned: false,
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
});
