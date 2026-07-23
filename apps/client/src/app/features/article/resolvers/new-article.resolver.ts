import { ArticleService } from '../../../services/articles';
import { ArticleEditSession } from '../models/article-edit-session';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, RedirectCommand, ResolveFn, Router } from '@angular/router';
import { decodeArticleTitle, encodeArticleTitle } from '@drevo-web/shared';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

/**
 * Resolves `/articles/find/:title/edit` into a `create` session.
 *
 * Re-checks the title so a direct URL hit cannot bypass the placeholder page:
 * an article that meanwhile exists redirects to it, and a user without the
 * right to create is sent back to the placeholder, which explains why.
 */
export function resolveNewArticle(
    articleService: ArticleService,
    router: Router,
    route: ActivatedRouteSnapshot,
): Observable<ArticleEditSession | RedirectCommand> {
    // `:title` lives on the parent route — child routes do not inherit params
    // under the default `emptyOnly` inheritance strategy.
    const titleParam = route.paramMap.get('title') ?? route.parent?.paramMap.get('title') ?? '';
    const title = decodeArticleTitle(titleParam);

    return articleService.findArticleByTitle(title).pipe(
        map(result => {
            if (result.found) {
                return new RedirectCommand(router.parseUrl(`/articles/${result.articleId}`), { replaceUrl: true });
            }
            if (!result.canCreate) {
                return new RedirectCommand(router.parseUrl(`/articles/find/${encodeArticleTitle(title)}`), {
                    replaceUrl: true,
                });
            }
            return { mode: 'create', articleId: 0, versionId: 0, title, content: '' } as const;
        }),
        catchError(() =>
            of(
                new RedirectCommand(router.parseUrl(`/articles/find/${encodeArticleTitle(title)}`), {
                    replaceUrl: true,
                }),
            ),
        ),
    );
}

export const newArticleResolver: ResolveFn<ArticleEditSession | RedirectCommand> = route =>
    resolveNewArticle(inject(ArticleService), inject(Router), route);
