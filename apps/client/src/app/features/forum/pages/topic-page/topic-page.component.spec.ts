import { ForumService } from '../../../../services/forum/forum.service';
import { createRouteSnapshot } from '../../../../shared/testing/route-testing.helper';
import { ForumTopicResolveResult } from '../../resolvers/forum-topic.resolver';
import { TopicPageComponent } from './topic-page.component';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { ForumMessage, ForumTopic, ForumTopicPage } from '@drevo-web/shared';
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
    let scrolled: Element[];
    let originalScrollIntoView: typeof Element.prototype.scrollIntoView;

    const createComponent = createComponentFactory({
        component: TopicPageComponent,
        providers: [provideRouter([]), mockLoggerProvider()],
        detectChanges: false,
    });

    beforeEach(() => {
        forumService = { getTopic: jest.fn() };
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

    const click = (testId: string): void => {
        spectator.click(`[data-testid="${testId}"]`);
        spectator.detectChanges();
    };

    describe('the topic header', () => {
        it('shows the title, the author and the date', () => {
            render(createTopicPage([createMessage(1)], 1, 1));

            expect(spectator.query('[data-testid="topic-title"]')).toHaveText('Тема о святых');
            expect(spectator.query('[data-testid="topic-author"]')).toHaveText('Иванов И.И.');
            expect(spectator.query('[data-testid="topic-created"]')).toBeTruthy();
        });

        it('links to the article the topic hangs off', () => {
            render(createTopicPage([createMessage(1)], 1, 1, { article: { id: 7, title: 'Москва' } }));

            const link = spectator.query('[data-testid="topic-article"]');
            expect(link).toHaveText('Москва');
            expect(link?.getAttribute('href')).toBe('/articles/7');
        });

        it('offers no article link for a topic that hangs off none', () => {
            render(createTopicPage([createMessage(1)], 1, 1));

            expect(spectator.query('[data-testid="topic-article"]')).toBeNull();
        });
    });

    describe('the messages', () => {
        it('renders one card per message of the served page', () => {
            render(createTopicPage([createMessage(1), createMessage(2)], 1, 1));

            expect(cardIds()).toEqual(['message-1', 'message-2']);
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
        it('offers the earlier messages when the served page is not the first', () => {
            render(createTopicPage([createMessage(3)], 2, 3));

            expect(spectator.query('[data-testid="topic-load-previous"]')).toHaveText('Показать предыдущие');
            expect(spectator.query('[data-testid="topic-load-next"]')).toHaveText('Показать следующие');
        });

        it('offers neither direction when the whole topic fits on the served page', () => {
            render(createTopicPage([createMessage(1)], 1, 1));

            expect(spectator.query('[data-testid="topic-load-previous"]')).toBeNull();
            expect(spectator.query('[data-testid="topic-load-next"]')).toBeNull();
        });

        it('prepends the previous page above the served one', () => {
            render(createTopicPage([createMessage(3)], 2, 3));
            forumService.getTopic.mockReturnValue(of(createTopicPage([createMessage(2)], 1, 3)));

            click('topic-load-previous');

            expect(forumService.getTopic).toHaveBeenCalledWith(42, 1);
            expect(cardIds()).toEqual(['message-2', 'message-3']);
            expect(spectator.query('[data-testid="topic-load-previous"]')).toBeNull();
        });

        it('appends the next page below the served one', () => {
            render(createTopicPage([createMessage(3)], 2, 3));
            forumService.getTopic.mockReturnValue(of(createTopicPage([createMessage(4)], 3, 3)));

            click('topic-load-next');

            expect(forumService.getTopic).toHaveBeenCalledWith(42, 3);
            expect(cardIds()).toEqual(['message-3', 'message-4']);
            expect(spectator.query('[data-testid="topic-load-next"]')).toBeNull();
        });

        it('never rewrites the address, so the resolver does not re-run', () => {
            render(createTopicPage([createMessage(3)], 2, 3));
            const router = spectator.inject(Router);
            const navigate = jest.spyOn(router, 'navigate');
            const navigateByUrl = jest.spyOn(router, 'navigateByUrl');
            forumService.getTopic.mockReturnValue(of(createTopicPage([createMessage(4)], 3, 3)));

            click('topic-load-next');

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

            click('topic-load-next');
            resolveAgain(createTopicPage([createMessage(9)], 2, 3));
            inFlight.next(createTopicPage([createMessage(4)], 3, 3));
            spectator.detectChanges();

            expect(cardIds()).toEqual(['message-9']);
        });

        it('offers to load more again after a topic change interrupted one', () => {
            render(createTopicPage([createMessage(3)], 2, 3));
            forumService.getTopic.mockReturnValue(new Subject<ForumTopicPage>());

            click('topic-load-next');
            resolveAgain(createTopicPage([createMessage(9)], 2, 3));
            forumService.getTopic.mockReturnValue(of(createTopicPage([createMessage(10)], 3, 3)));
            click('topic-load-next');

            expect(cardIds()).toEqual(['message-9', 'message-10']);
        });

        it('keeps the messages it has and reports a failed load-more', () => {
            render(createTopicPage([createMessage(3)], 2, 3));
            forumService.getTopic.mockReturnValue(throwError(() => new Error('Network error')));

            click('topic-load-next');

            expect(cardIds()).toEqual(['message-3']);
            expect(spectator.query('[data-testid="topic-load-next"]')).toBeTruthy();
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
