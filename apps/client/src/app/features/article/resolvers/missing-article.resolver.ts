import { ArticleService } from '../../../services/articles';
import { MissingArticle } from '../models/missing-article';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, RedirectCommand, ResolveFn, Router } from '@angular/router';
import { Logger, LoggerService } from '@drevo-web/core';
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
): Observable<MissingArticle | RedirectCommand | undefined> {
    // The router already percent-decodes the param and the segment carries the
    // title verbatim (backend emits rawurlencode), so no transform is needed.
    const title = route.paramMap.get('title') ?? '';

    return articleService.findArticleByTitle(title).pipe(
        map(result => {
            if (result.found) {
                return new RedirectCommand(router.parseUrl(`/articles/${result.articleId}`), { replaceUrl: true });
            }
            return { articleId: 0, title, canCreate: result.canCreate, reason: result.reason } as const;
        }),
        catchError(error => {
            // Existence was never established, so we must not render the "does not
            // exist" placeholder. Resolve to undefined — ArticleComponent then
            // shows its generic load-error state instead of a false result.
            logger.error('Failed to resolve article by title', error);
            return of(undefined);
        }),
    );
}

export const missingArticleResolver: ResolveFn<MissingArticle | RedirectCommand | undefined> = route =>
    resolveMissingArticle(
        inject(ArticleService),
        inject(Router),
        inject(LoggerService).withContext('MissingArticleResolver'),
        route,
    );
