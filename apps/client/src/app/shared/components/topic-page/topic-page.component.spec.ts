import { AuthService } from '../../../services/auth/auth.service';
import { ForumService } from '../../../services/forum/forum.service';
import { createRouteSnapshot } from '../../testing/route-testing.helper';
import { ForumTopicResolveResult } from '../../services/forum-topic-page/forum-topic-page-data.service';
import { TopicPageComponent } from './topic-page.component';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { ForumMessage, ForumTopic, ForumTopicPage, User } from '@drevo-web/shared';
import { createMockUser } from '@drevo-web/shared/testing';
import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';

const topic: ForumTopic = {
    id: 42,
    title: 'Тема о святых',
    part: 'common',
    partId: undefined,
    article: undefined,
    author: 'Иванов И.И.',
    createdAt: new Date('2025-03-15T10:00:00Z'),
    repliesCount: 5,
};

function createMessage(id: number, overrides: Partial<ForumMessage> = {}): ForumMessage {
    return {
        id,
        parentId: undefined,
        author: { name: `Автор ${id}`, login: undefined },
        createdAt: new Date('2025-03-15T10:00:00Z'),
        html: `<p>Сообщение ${id}</p>`,
        ...overrides,
    };
}

function createTopicPage(
    messages: readonly ForumMessage[],
    page: number,
    totalPages: number,
    topicOverrides: Partial<ForumTopic> = {},
): ForumTopicPage {
    return {
        topic: { ...topic, ...topicOverrides },
        messages: { items: messages, total: totalPages, page, pageSize: 1, totalPages },
    };
}

describe('TopicPageComponent', () => {
    let spectator: Spectator<TopicPageComponent>;
    let forumService: { getTopic: jest.Mock };
    let routeData: BehaviorSubject<{ topic: ForumTopicResolveResult }>;
    let user: BehaviorSubject<User | undefined>;
    let scrolled: Element[];
    let originalScrollIntoView: typeof Element.prototype.scrollIntoView;

    const createComponent = createComponentFactory({
        component: TopicPageComponent,
        providers: [provideRouter([]), mockLoggerProvider()],
        detectChanges: false,
    });

    beforeEach(() => {
        forumService = { getTopic: jest.fn() };
        user = new BehaviorSubject<User | undefined>(undefined);
        scrolled = [];
        originalScrollIntoView = Element.prototype.scrollIntoView;
        Element.prototype.scrollIntoView = function (this: Element): void {
            scrolled.push(this);
        };
    });

    afterEach(() => {
        Element.prototype.scrollIntoView = originalScrollIntoView;
    });

    const render = (result: ForumTopicResolveResult, params: Record<string, string> = { id: '42' }): void => {
        routeData = new BehaviorSubject({ topic: result });
        spectator = createComponent({
            providers: [
                { provide: ForumService, useValue: forumService },
                { provide: AuthService, useValue: { user$: user.asObservable() } },
                {
                    provide: ActivatedRoute,
                    useValue: { data: routeData.asObservable(), snapshot: createRouteSnapshot(params) },
                },
            ],
        });
        spectator.detectChanges();
    };

    /** A second navigation into the same route config, which reuses the component. */
    const resolveAgain = (result: ForumTopicResolveResult): void => {
        routeData.next({ topic: result });
        spectator.detectChanges();
    };

    const cardIds = (): (string | null)[] =>
        spectator.queryAll('app-message-card').map(element => element.getAttribute('data-testid'));

    /** The reader scrolled one end of the feed into view. */
    const reach = (end: 'previous' | 'next'): void => {
        spectator.triggerEventHandler(`[data-testid="topic-load-${end}"]`, 'uiInView', undefined);
        spectator.detectChanges();
    };

    const retry = (end: 'previous' | 'next'): void => {
        spectator.click(`[data-testid="topic-retry-${end}"]`);
        spectator.detectChanges();
    };

    describe('the topic header', () => {
        it('shows the title, the author and the date', () => {
            render(createTopicPage([createMessage(1)], 1, 1));

            expect(spectator.query('[data-testid="topic-page-title"]')).toHaveText('Тема о святых');
            expect(spectator.query('[data-testid="topic-page-author"]')).toHaveText('Иванов И.И.');
            expect(spectator.query('[data-testid="topic-page-created"]')).toBeTruthy();
        });

        it('links to the article the topic hangs off', () => {
            render(createTopicPage([createMessage(1)], 1, 1, { article: { id: 7, title: 'Москва' } }));

            const link = spectator.query('[data-testid="topic-page-article"]');
            expect(link).toHaveText('Москва');
            expect(link?.getAttribute('href')).toBe('/articles/7');
        });

        it('offers no article link for a topic that hangs off none', () => {
            render(createTopicPage([createMessage(1)], 1, 1));

            expect(spectator.query('[data-testid="topic-page-article"]')).toBeNull();
        });
    });

    describe('the messages', () => {
        it('renders one card per message of the served page', () => {
            render(createTopicPage([createMessage(1), createMessage(2)], 1, 1));

            expect(cardIds()).toEqual(['message-1', 'message-2']);
        });

        it('heads the first message of each day with that day', () => {
            render(
                createTopicPage(
                    [
                        createMessage(1, { createdAt: new Date(2025, 2, 15, 10, 0) }),
                        createMessage(2, { createdAt: new Date(2025, 2, 15, 11, 0) }),
                        createMessage(3, { createdAt: new Date(2025, 2, 16, 9, 0) }),
                    ],
                    1,
                    1,
                ),
            );

            expect(spectator.queryAll('[data-testid="topic-day"]').map(day => day.textContent?.trim())).toEqual([
                '15 марта 2025 г.',
                '16 марта 2025 г.',
            ]);
        });

        it('joins consecutive messages of one author into a series', () => {
            const author = { name: 'Андрей Петров', login: 'andrey' };
            render(
                createTopicPage(
                    [
                        createMessage(1, { author, createdAt: new Date(2025, 2, 15, 10, 0) }),
                        createMessage(2, { author, createdAt: new Date(2025, 2, 15, 10, 1) }),
                    ],
                    1,
                    1,
                ),
            );

            expect(spectator.query('[data-testid="message-1"]')).not.toHaveClass('message-card--series-end');
            expect(spectator.query('[data-testid="message-2"]')).toHaveClass('message-card--series-end');
        });

        it('quotes the answered message when it is loaded', () => {
            render(createTopicPage([createMessage(1), createMessage(2, { parentId: 1 })], 1, 1));

            expect(
                spectator.query('[data-testid="message-2"] [data-testid="message-quote-author"]'),
            ).toHaveExactTrimmedText('Автор 1');
        });

        it("sets the reader's own messages apart once the reader is known", () => {
            render(
                createTopicPage(
                    [createMessage(1, { author: { name: 'Автор 1', login: 'reader' } }), createMessage(2)],
                    1,
                    1,
                ),
            );
            expect(spectator.query('[data-testid="message-1"]')).not.toHaveClass('message-card--own');

            user.next(createMockUser({ login: 'reader' }));
            spectator.detectChanges();

            expect(spectator.query('[data-testid="message-1"]')).toHaveClass('message-card--own');
            expect(spectator.query('[data-testid="message-2"]')).not.toHaveClass('message-card--own');
        });
    });

    describe('the anchor', () => {
        it('anchors on the message the address names', () => {
            render(createTopicPage([createMessage(1), createMessage(7)], 1, 1), { id: '42', messageId: '7' });

            expect(spectator.component.anchorId()).toBe(7);
        });

        it('scrolls to the anchored card', () => {
            render(createTopicPage([createMessage(1), createMessage(7)], 1, 1), { id: '42', messageId: '7' });

            expect(scrolled.map(element => element.getAttribute('data-testid'))).toEqual(['message-7']);
        });

        it('highlights the anchored card and nothing else', () => {
            render(createTopicPage([createMessage(1), createMessage(7)], 1, 1), { id: '42', messageId: '7' });

            expect(spectator.query('[data-testid="message-7"]')).toHaveClass('message-card--anchored');
            expect(spectator.query('[data-testid="message-1"]')).not.toHaveClass('message-card--anchored');
        });

        it('scrolls nowhere when the address names no message', () => {
            render(createTopicPage([createMessage(1)], 1, 1));

            expect(spectator.component.anchorId()).toBeUndefined();
            expect(scrolled).toHaveLength(0);
        });
    });

    describe('loading more', () => {
        it('watches both ends of the feed when the served page is in the middle', () => {
            render(createTopicPage([createMessage(3)], 2, 3));

            expect(spectator.query('[data-testid="topic-load-previous"]')).toBeTruthy();
            expect(spectator.query('[data-testid="topic-load-next"]')).toBeTruthy();
        });

        it('watches neither end when the whole topic fits on the served page', () => {
            render(createTopicPage([createMessage(1)], 1, 1));

            expect(spectator.query('[data-testid="topic-load-previous"]')).toBeNull();
            expect(spectator.query('[data-testid="topic-load-next"]')).toBeNull();
        });

        it('prepends the previous page above the served one', () => {
            render(createTopicPage([createMessage(3)], 2, 3));
            forumService.getTopic.mockReturnValue(of(createTopicPage([createMessage(2)], 1, 3)));

            reach('previous');

            expect(forumService.getTopic).toHaveBeenCalledWith(42, 1);
            expect(cardIds()).toEqual(['message-2', 'message-3']);
            expect(spectator.query('[data-testid="topic-load-previous"]')).toBeNull();
        });

        it('appends the next page below the served one', () => {
            render(createTopicPage([createMessage(3)], 2, 3));
            forumService.getTopic.mockReturnValue(of(createTopicPage([createMessage(4)], 3, 3)));

            reach('next');

            expect(forumService.getTopic).toHaveBeenCalledWith(42, 3);
            expect(cardIds()).toEqual(['message-3', 'message-4']);
            expect(spectator.query('[data-testid="topic-load-next"]')).toBeNull();
        });

        /**
         * The two directions are independent requests, so one in flight must
         * not be torn down by a click on the other.
         */
        it('lets the two directions run side by side', () => {
            render(createTopicPage([createMessage(3)], 2, 3));
            const previous = new Subject<ForumTopicPage>();
            const next = new Subject<ForumTopicPage>();
            forumService.getTopic.mockReturnValueOnce(previous).mockReturnValueOnce(next);

            reach('previous');
            reach('next');
            previous.next(createTopicPage([createMessage(2)], 1, 3));
            next.next(createTopicPage([createMessage(4)], 3, 3));
            spectator.detectChanges();

            expect(cardIds()).toEqual(['message-2', 'message-3', 'message-4']);
        });

        it('never rewrites the address, so the resolver does not re-run', () => {
            render(createTopicPage([createMessage(3)], 2, 3));
            const router = spectator.inject(Router);
            const navigate = jest.spyOn(router, 'navigate');
            const navigateByUrl = jest.spyOn(router, 'navigateByUrl');
            forumService.getTopic.mockReturnValue(of(createTopicPage([createMessage(4)], 3, 3)));

            reach('next');

            expect(navigate).not.toHaveBeenCalled();
            expect(navigateByUrl).not.toHaveBeenCalled();
        });

        /**
         * `/forum/topic/:id` renders the same component for every topic, so
         * moving to another one reuses it. A load-more still in flight for the
         * topic the reader left must not land in the one they arrived at.
         */
        it('drops a load-more that a new topic resolved past', () => {
            render(createTopicPage([createMessage(3)], 2, 3));
            const inFlight = new Subject<ForumTopicPage>();
            forumService.getTopic.mockReturnValue(inFlight);

            reach('next');
            resolveAgain(createTopicPage([createMessage(9)], 2, 3));
            inFlight.next(createTopicPage([createMessage(4)], 3, 3));
            spectator.detectChanges();

            expect(cardIds()).toEqual(['message-9']);
        });

        it('offers to load more again after a topic change interrupted one', () => {
            render(createTopicPage([createMessage(3)], 2, 3));
            forumService.getTopic.mockReturnValue(new Subject<ForumTopicPage>());

            reach('next');
            resolveAgain(createTopicPage([createMessage(9)], 2, 3));
            forumService.getTopic.mockReturnValue(of(createTopicPage([createMessage(10)], 3, 3)));
            reach('next');

            expect(cardIds()).toEqual(['message-9', 'message-10']);
        });

        it('shows a spinner in place of the end it is loading', () => {
            render(createTopicPage([createMessage(3)], 2, 3));
            forumService.getTopic.mockReturnValue(new Subject<ForumTopicPage>());

            reach('previous');

            expect(spectator.query('[data-testid="topic-loading-previous"]')).toBeTruthy();
            expect(spectator.query('[data-testid="topic-load-previous"]')).toBeNull();
        });

        /**
         * The end is still on screen after a failure, so retrying on sight
         * would hammer a failing backend in a loop.
         */
        it('keeps the messages it has and offers a retry instead of retrying on its own', () => {
            render(createTopicPage([createMessage(3)], 2, 3));
            forumService.getTopic.mockReturnValue(throwError(() => new Error('Network error')));

            reach('next');

            expect(cardIds()).toEqual(['message-3']);
            expect(spectator.query('[data-testid="topic-load-next"]')).toBeNull();
            expect(spectator.query('[data-testid="topic-retry-next"]')).toBeTruthy();
        });

        it('loads the page again on retry', () => {
            render(createTopicPage([createMessage(3)], 2, 3));
            forumService.getTopic.mockReturnValueOnce(throwError(() => new Error('Network error')));
            reach('next');
            forumService.getTopic.mockReturnValue(of(createTopicPage([createMessage(4)], 3, 3)));

            retry('next');

            expect(cardIds()).toEqual(['message-3', 'message-4']);
        });
    });

    describe('the failure arms', () => {
        it('shows the not-found error for a topic that does not exist', () => {
            render('not-found');

            const error = spectator.query('[data-testid="topic-not-found"]');
            expect(error?.getAttribute('title')).toBe('Тема не найдена');
            expect(error?.getAttribute('message')).toBe('Запрашиваемая тема не существует или была удалена.');
            expect(cardIds()).toEqual([]);
        });

        it('shows the load error when the request failed', () => {
            render('load-error');

            const error = spectator.query('[data-testid="topic-load-error"]');
            expect(error?.getAttribute('title')).toBe('Ошибка загрузки');
            expect(error?.getAttribute('message')).toBe('Не удалось загрузить тему. Попробуйте обновить страницу.');
            expect(cardIds()).toEqual([]);
        });
    });
});
