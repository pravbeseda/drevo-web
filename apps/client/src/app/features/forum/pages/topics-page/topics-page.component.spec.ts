import { ForumService } from '../../../../services/forum/forum.service';
import { createRouteSnapshot } from '../../../../shared/testing/route-testing.helper';
import { ForumTopicsResolveResult } from '../../resolvers/forum-topics.resolver';
import { TopicsPageComponent } from './topics-page.component';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { ForumTopicListItem, ForumTopicListResponse } from '@drevo-web/shared';
import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';

function createItem(id: number): ForumTopicListItem {
    return {
        id,
        title: `Тема ${id}`,
        author: 'Иванов И.И.',
        createdAt: new Date('2025-03-15T10:00:00Z'),
        repliesCount: 0,
        lastPostId: undefined,
        lastPostAt: undefined,
        pinned: false,
    };
}

function createPage(overrides: Partial<ForumTopicListResponse> = {}): ForumTopicListResponse {
    return {
        items: [createItem(1)],
        total: 3,
        page: 1,
        pageSize: 1,
        totalPages: 3,
        ...overrides,
    };
}

describe('TopicsPageComponent', () => {
    let spectator: Spectator<TopicsPageComponent>;
    let forumService: { getTopics: jest.Mock };
    let routeData: BehaviorSubject<{ topics: ForumTopicsResolveResult }>;

    const createComponent = createComponentFactory({
        component: TopicsPageComponent,
        providers: [provideRouter([]), mockLoggerProvider()],
    });

    beforeEach(() => {
        forumService = { getTopics: jest.fn() };
    });

    const render = (result: ForumTopicsResolveResult, params: Record<string, string> = {}): void => {
        routeData = new BehaviorSubject({ topics: result });
        spectator = createComponent({
            providers: [
                { provide: ForumService, useValue: forumService },
                {
                    provide: ActivatedRoute,
                    useValue: { data: routeData.asObservable(), snapshot: createRouteSnapshot(params) },
                },
            ],
        });
    };

    /** A second navigation into the same route config, which reuses the component. */
    const resolveAgain = (result: ForumTopicsResolveResult): void => {
        routeData.next({ topics: result });
        spectator.detectChanges();
    };

    const loadMore = (): void => {
        spectator.click('[data-testid="topics-load-more"]');
        spectator.detectChanges();
    };

    const titles = (): (string | undefined)[] =>
        spectator.queryAll('[data-testid="topic-title"]').map(element => element.textContent?.trim());

    it('renders the resolved page as a topic list', () => {
        render(createPage({ items: [createItem(1), createItem(2)] }));

        expect(spectator.query('app-topic-list')).toBeTruthy();
        expect(titles()).toEqual(['Тема 1', 'Тема 2']);
    });

    it('offers to load more while pages remain', () => {
        render(createPage({ page: 1, totalPages: 3 }));

        expect(spectator.query('[data-testid="topics-load-more"]')).toHaveText('Показать следующие');
    });

    it('offers nothing more on the last page', () => {
        render(createPage({ page: 3, totalPages: 3 }));

        expect(spectator.query('[data-testid="topics-load-more"]')).toBeNull();
    });

    it('appends the next page below the served one', () => {
        render(createPage({ items: [createItem(1)], page: 1, totalPages: 3 }));
        forumService.getTopics.mockReturnValue(of(createPage({ items: [createItem(2)], page: 2, totalPages: 3 })));

        loadMore();

        expect(titles()).toEqual(['Тема 1', 'Тема 2']);
    });

    it('never rewrites the address, so the resolver does not re-run', () => {
        render(createPage({ page: 1, totalPages: 3 }));
        const router = spectator.inject(Router);
        const navigate = jest.spyOn(router, 'navigate');
        const navigateByUrl = jest.spyOn(router, 'navigateByUrl');
        forumService.getTopics.mockReturnValue(of(createPage({ items: [createItem(2)], page: 2, totalPages: 3 })));

        loadMore();

        expect(navigate).not.toHaveBeenCalled();
        expect(navigateByUrl).not.toHaveBeenCalled();
    });

    it('asks for the next page of the section the address names', () => {
        render(createPage({ page: 1, totalPages: 3 }), { part: 'articles', partId: '42' });
        forumService.getTopics.mockReturnValue(of(createPage({ items: [createItem(2)], page: 2, totalPages: 3 })));

        loadMore();

        expect(forumService.getTopics).toHaveBeenCalledWith('articles', 42, 2);
    });

    it('asks for every section when the address names none', () => {
        render(createPage({ page: 1, totalPages: 3 }));
        forumService.getTopics.mockReturnValue(of(createPage({ items: [createItem(2)], page: 2, totalPages: 3 })));

        loadMore();

        expect(forumService.getTopics).toHaveBeenCalledWith(undefined, undefined, 2);
    });

    it('keeps the rows it has and reports a failed load-more', () => {
        render(createPage({ items: [createItem(1)], page: 1, totalPages: 3 }));
        forumService.getTopics.mockReturnValue(throwError(() => new Error('Network error')));

        loadMore();

        expect(titles()).toEqual(['Тема 1']);
        expect(spectator.query('[data-testid="topics-load-more"]')).toBeTruthy();
    });

    /**
     * `/forum/:part` renders the same component for every section, so moving to
     * another section reuses it. A load-more still in flight for the section the
     * reader left must not land in the list of the one they arrived at.
     */
    it('drops a load-more that a new section resolved past', () => {
        render(createPage({ items: [createItem(1)], page: 1, totalPages: 3 }));
        const inFlight = new Subject<ForumTopicListResponse>();
        forumService.getTopics.mockReturnValue(inFlight);

        loadMore();
        resolveAgain(createPage({ items: [createItem(9)], page: 1, totalPages: 3 }));
        inFlight.next(createPage({ items: [createItem(2)], page: 2, totalPages: 3 }));
        spectator.detectChanges();

        expect(titles()).toEqual(['Тема 9']);
    });

    it('offers to load more again after a section change interrupted one', () => {
        render(createPage({ items: [createItem(1)], page: 1, totalPages: 3 }));
        forumService.getTopics.mockReturnValue(new Subject<ForumTopicListResponse>());

        loadMore();
        resolveAgain(createPage({ items: [createItem(9)], page: 1, totalPages: 3 }));
        forumService.getTopics.mockReturnValue(of(createPage({ items: [createItem(10)], page: 2, totalPages: 3 })));
        loadMore();

        expect(titles()).toEqual(['Тема 9', 'Тема 10']);
    });

    it('shows the not-found error for a section that does not exist', () => {
        render('not-found');

        const error = spectator.query('[data-testid="topics-not-found"]');
        expect(error?.getAttribute('title')).toBe('Раздел не найден');
        expect(error?.getAttribute('message')).toBe('Запрашиваемый раздел форума не существует.');
        expect(spectator.query('app-topic-list')).toBeNull();
    });

    it('shows the load error when the request failed', () => {
        render('load-error');

        const error = spectator.query('[data-testid="topics-load-error"]');
        expect(error?.getAttribute('title')).toBe('Ошибка загрузки');
        expect(error?.getAttribute('message')).toBe('Не удалось загрузить список тем. Попробуйте обновить страницу.');
        expect(spectator.query('app-topic-list')).toBeNull();
    });

    it('tells the reader the list it served is empty', () => {
        render(createPage({ items: [], total: 0, page: 1, totalPages: 0 }));

        expect(spectator.query('[data-testid="topics-empty"]')).toHaveText('Тем пока нет.');
    });
});
