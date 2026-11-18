import { resolveArticleNewsCreateSession } from './article-news-create-session.resolver';
import { ArticleService } from '../../../services/articles';
import { NewsService } from '../../../services/news/news.service';
import { NewsCreateDeps } from '../../../shared/resolvers/news-create-session.resolver';
import { createRouteSnapshot } from '../../../shared/testing/route-testing.helper';
import { RedirectCommand, Router, UrlTree } from '@angular/router';
import { NotificationService } from '@drevo-web/core';
import { MockLoggerService } from '@drevo-web/core/testing';
import { firstValueFrom, of } from 'rxjs';

describe('resolveArticleNewsCreateSession', () => {
    const topics = [{ id: 3, title: 'Церковь' }];
    const historyTree = new UrlTree();

    let newsService: jest.Mocked<Pick<NewsService, 'getTopics'>>;
    let deps: NewsCreateDeps;

    beforeEach(() => {
        newsService = { getTopics: jest.fn().mockReturnValue(of(topics)) };
        deps = {
            articleService: { checkEdit: () => of({ allowed: true }) } as unknown as ArticleService,
            notificationService: { error: jest.fn() } as unknown as NotificationService,
            isBrowser: true,
            router: { parseUrl: jest.fn().mockReturnValue(historyTree) } as unknown as Router,
            logger: new MockLoggerService().withContext('test'),
        };
    });

    function resolve(params: Record<string, string>) {
        return firstValueFrom(
            resolveArticleNewsCreateSession(createRouteSnapshot(params), newsService as unknown as NewsService, deps),
        );
    }

    it("opens a news item that leaves to the article's news tab and keeps its draft under the tab", async () => {
        const result = await resolve({ id: '42' });

        expect(result).toEqual(
            expect.objectContaining({
                kind: 'news',
                mode: 'create',
                exitUrl: '/articles/42/news',
                draftKey: '/articles/42/news/new',
                newsTopics: topics,
            }),
        );
    });

    it('sends an address naming no article to the news history', async () => {
        const result = await resolve({ id: 'abc' });

        expect(result).toBeInstanceOf(RedirectCommand);
        expect((result as RedirectCommand).redirectTo).toBe(historyTree);
        expect(deps.router.parseUrl).toHaveBeenCalledWith('/history/news');
        expect(newsService.getTopics).not.toHaveBeenCalled();
    });
});
