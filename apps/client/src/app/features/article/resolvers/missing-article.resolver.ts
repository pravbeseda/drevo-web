import { ArticleService } from '../../../services/articles';
import { MissingArticle } from '../models/missing-article';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, RedirectCommand, ResolveFn, Router } from '@angular/router';
import { Logger, LoggerService } from '@drevo-web/core';
import { decodeArticleTitle } from '@drevo-web/shared';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

/**
 * Resolves `/articles/find/:title`.
 *
 * Found -> redirect to the article page. Not found -> a `MissingArticle`
 * placeholder carrying whether the current user may create it.
 *
 * Titles the backend rejects (slash, empty, too long) come back as
 * `found: false, canCreate: false` with a reason, so no special case is needed.
 */
export function resolveMissingArticle(
    articleService: ArticleService,
    router: Router,
    logger: Logger,
    route: ActivatedRouteSnapshot,
): Observable<MissingArticle | RedirectCommand> {
    const title = decodeArticleTitle(route.paramMap.get('title') ?? '');

    return articleService.findArticleByTitle(title).pipe(
        map(result => {
            if (result.found) {
                return new RedirectCommand(router.parseUrl(`/articles/${result.articleId}`), { replaceUrl: true });
            }
            return { articleId: 0, title, canCreate: result.canCreate, reason: result.reason } as const;
        }),
        catchError(error => {
            logger.error('Failed to resolve article by title', error);
            return of({
                articleId: 0,
                title,
                canCreate: false,
                reason: 'Не удалось проверить права на создание статьи',
            } as const);
        }),
    );
}

export const missingArticleResolver: ResolveFn<MissingArticle | RedirectCommand> = route =>
    resolveMissingArticle(
        inject(ArticleService),
        inject(Router),
        inject(LoggerService).withContext('MissingArticleResolver'),
        route,
    );
