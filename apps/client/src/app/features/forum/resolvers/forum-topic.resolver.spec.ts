import { forumTopicResolver } from './forum-topic.resolver';
import { createRouteSnapshot } from '../../../shared/testing/route-testing.helper';
import { ForumTopicPageDataService } from '../services/forum-topic-page-data.service';
import { EnvironmentInjector, Injectable, runInInjectionContext } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { SpectatorService, createServiceFactory } from '@ngneat/spectator/jest';
import { Observable, of } from 'rxjs';

/** Dummy service to bootstrap Spectator's injection context. */
@Injectable()
class ResolverTestHelper {}

describe('forumTopicResolver', () => {
    let spectator: SpectatorService<ResolverTestHelper>;
    const data = { load: jest.fn() };
    const route: ActivatedRouteSnapshot = createRouteSnapshot({ id: '42' });
    const state = {} as RouterStateSnapshot;

    const createService = createServiceFactory({
        service: ResolverTestHelper,
        providers: [{ provide: ForumTopicPageDataService, useValue: data }],
    });

    it('answers with the load the route shares with its title', () => {
        data.load.mockReturnValue(of('not-found'));
        spectator = createService();

        const resolved: unknown = runInInjectionContext(spectator.inject(EnvironmentInjector), () =>
            forumTopicResolver(route, state),
        );

        let result: unknown;
        (resolved as Observable<unknown>).subscribe(value => (result = value));
        expect(result).toBe('not-found');
        expect(data.load).toHaveBeenCalledWith(route);
    });
});
