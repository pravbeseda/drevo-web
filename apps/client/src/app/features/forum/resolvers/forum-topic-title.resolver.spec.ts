import { forumTopicTitleResolver } from './forum-topic-title.resolver';
import { createRouteSnapshot } from '../../../shared/testing/route-testing.helper';
import { ForumTopicPageDataService, ForumTopicResolveResult } from '../services/forum-topic-page-data.service';
import { EnvironmentInjector, Injectable, runInInjectionContext } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ForumTopicPage } from '@drevo-web/shared';
import { SpectatorService, createServiceFactory } from '@ngneat/spectator/jest';
import { Observable, isObservable, of } from 'rxjs';

/** Dummy service to bootstrap Spectator's injection context. */
@Injectable()
class ResolverTestHelper {}

const topicPage: ForumTopicPage = {
    topic: {
        id: 42,
        title: 'Тема о статье',
        part: 'articles',
        partId: 7,
        article: undefined,
        author: 'Иванов И.И.',
        createdAt: undefined,
        repliesCount: 0,
    },
    messages: { items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 },
};

describe('forumTopicTitleResolver', () => {
    let spectator: SpectatorService<ResolverTestHelper>;
    let data: { load: jest.Mock };
    const route: ActivatedRouteSnapshot = createRouteSnapshot({ id: '42' });
    const state = {} as RouterStateSnapshot;

    const createService = createServiceFactory({
        service: ResolverTestHelper,
        providers: [{ provide: ForumTopicPageDataService, useFactory: () => data }],
    });

    const resolveTitle = (result: ForumTopicResolveResult): string | undefined => {
        data = { load: jest.fn().mockReturnValue(of(result)) };
        spectator = createService();

        const resolved: unknown = runInInjectionContext(spectator.inject(EnvironmentInjector), () =>
            forumTopicTitleResolver(route, state),
        );

        let title: string | undefined;
        (resolved as Observable<string>).subscribe(value => (title = value));
        expect(isObservable(resolved)).toBe(true);
        return title;
    };

    it('titles the page with the topic the address names', () => {
        expect(resolveTitle(topicPage)).toBe('Тема о статье');
        expect(data.load).toHaveBeenCalledWith(route);
    });

    it.each([['not-found'], ['load-error']] as const)('falls back to the forum when the topic is %s', result => {
        expect(resolveTitle(result)).toBe('Форум');
    });
});
