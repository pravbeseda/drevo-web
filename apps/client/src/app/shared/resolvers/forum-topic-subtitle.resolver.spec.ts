import { forumTopicSubtitleResolver } from './forum-topic-subtitle.resolver';
import { PageSubtitle } from '../../services/page-title.strategy';
import { createRouteSnapshot } from '../testing/route-testing.helper';
import {
    ForumTopicPageDataService,
    ForumTopicResolveResult,
} from '../services/forum-topic-page/forum-topic-page-data.service';
import { EnvironmentInjector, Injectable, runInInjectionContext } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ForumTopic, ForumTopicPage } from '@drevo-web/shared';
import { SpectatorService, createServiceFactory } from '@ngneat/spectator/jest';
import { Observable, isObservable, of } from 'rxjs';

/** Dummy service to bootstrap Spectator's injection context. */
@Injectable()
class ResolverTestHelper {}

const topic: ForumTopic = {
    id: 42,
    title: 'Модератору — о переименовании иллюстрации',
    part: 'articles',
    partId: 7,
    article: { id: 7, title: 'Макарий Великий' },
    author: 'Николая',
    createdAt: undefined,
    repliesCount: 0,
};

const pageOf = (overrides: Partial<ForumTopic>): ForumTopicPage => ({
    topic: { ...topic, ...overrides },
    messages: { items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 },
});

describe('forumTopicSubtitleResolver', () => {
    let spectator: SpectatorService<ResolverTestHelper>;
    let data: { load: jest.Mock };
    const route: ActivatedRouteSnapshot = createRouteSnapshot({ id: '42' });
    const state = {} as RouterStateSnapshot;

    const createService = createServiceFactory({
        service: ResolverTestHelper,
        providers: [{ provide: ForumTopicPageDataService, useFactory: () => data }],
    });

    const resolveSubtitle = (result: ForumTopicResolveResult): PageSubtitle | undefined => {
        data = { load: jest.fn().mockReturnValue(of(result)) };
        spectator = createService();

        const resolved: unknown = runInInjectionContext(spectator.inject(EnvironmentInjector), () =>
            forumTopicSubtitleResolver(route, state),
        );

        let subtitle: PageSubtitle | undefined;
        (resolved as Observable<PageSubtitle | undefined>).subscribe(value => (subtitle = value));
        expect(isObservable(resolved)).toBe(true);
        return subtitle;
    };

    it('names the article a topic hangs off', () => {
        expect(resolveSubtitle(pageOf({}))).toEqual({
            prefix: 'к статье',
            label: 'Макарий Великий',
            link: '/articles/7',
        });
        expect(data.load).toHaveBeenCalledWith(route);
    });

    it('names a news item as one, linking it as the article it is', () => {
        expect(resolveSubtitle(pageOf({ part: 'news', article: { id: 9, title: 'Престольный праздник' } }))).toEqual({
            prefix: 'к новости',
            label: 'Престольный праздник',
            link: '/articles/9',
        });
    });

    it('gives a topic that hangs off nothing no subtitle', () => {
        expect(resolveSubtitle(pageOf({ part: 'common', partId: undefined, article: undefined }))).toBeUndefined();
    });

    it.each([['not-found'], ['load-error']] as const)('gives no subtitle when the topic is %s', result => {
        expect(resolveSubtitle(result)).toBeUndefined();
    });
});
