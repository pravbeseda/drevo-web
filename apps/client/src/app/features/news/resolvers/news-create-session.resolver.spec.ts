import { resolveHistoryNewsCreateSession } from './news-create-session.resolver';
import { AuthService } from '../../../services/auth/auth.service';
import { NewsCreateDeps } from '../../../shared/resolvers/news-create-session.resolver';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { MockLoggerService } from '@drevo-web/core/testing';
import { createMockUser } from '@drevo-web/shared/testing';
import { firstValueFrom } from 'rxjs';

describe('resolveHistoryNewsCreateSession', () => {
    const routeUnder = (parentData: Record<string, unknown>): ActivatedRouteSnapshot =>
        ({ parent: { data: parentData } }) as unknown as ActivatedRouteSnapshot;

    const deps: NewsCreateDeps = {
        authService: { currentUser: createMockUser({ permissions: { canEdit: true } }) } as AuthService,
        isBrowser: true,
        router: {} as Router,
        logger: new MockLoggerService().withContext('test'),
    };

    it('opens an empty news item that leaves to the news history, with the sections the news root resolved', async () => {
        const topics = [{ id: 3, title: 'Церковь' }];

        const result = await firstValueFrom(resolveHistoryNewsCreateSession(routeUnder({ topics }), deps));

        expect(result).toEqual({
            kind: 'news',
            mode: 'create',
            articleId: 0,
            versionId: 0,
            title: '',
            content: '',
            exitUrl: '/history/news',
            draftKey: '/news/new',
            newsTopics: topics,
        });
    });

    it('opens it with no sections when the root resolved none', async () => {
        const result = await firstValueFrom(resolveHistoryNewsCreateSession(routeUnder({}), deps));

        expect(result).toEqual(expect.objectContaining({ newsTopics: [] }));
    });
});
