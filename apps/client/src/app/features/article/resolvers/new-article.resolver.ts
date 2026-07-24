import { ArticleService } from '../../../services/articles';
import { ArticleEditSession } from '../models/article-edit-session';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, RedirectCommand, ResolveFn, Router } from '@angular/router';
import { decodeArticleTitle } from '@drevo-web/shared';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

/**
 * Resolves `/articles/find/:title/edit` into a `create` session.
 *
 * Re-checks the title so a direct URL hit cannot bypass the placeholder page:
 * an article that meanwhile exists redirects to it, and a user without the
 * right to create is sent back to the placeholder, which explains why.
 *
 * This repeats the parent route's `missingArticleResolver` lookup, and that is
 * intentional: resolvers run before components activate, so this child cannot
 * read the parent's resolved data, and both the shell (parent) and the editor
 * (child) legitimately need the title-derived state. On the forward flow
 * (placeholder → "create" button → `/edit`) the parent stays active and does
 * not re-run (see `shouldRerunMissingArticleResolver`), so the forward duplicate
 * is bounded to direct/refresh hits on `/edit`. When this child redirects back
 * to the placeholder (creation denied), the parent DOES re-run — refreshing a
 * possibly stale `canCreate` so the "create" button reflects the new state.
 *
 * The two resolvers never issue conflicting redirects: when `found`, both
 * redirect to the same `/articles/:id`; when not found, the parent returns data
 * (never redirects) while only this child may redirect (to the placeholder).
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

    // Build redirects with createUrlTree so each segment (the title in
    // particular) is encoded by the router. Interpolating a decoded title into
    // parseUrl would parse it as URL grammar: "(" truncates the segment and "%"
    // throws "URI malformed".
    const placeholderRedirect = () =>
        new RedirectCommand(router.createUrlTree(['/articles', 'find', title]), { replaceUrl: true });

    return articleService.findArticleByTitle(title).pipe(
        map(result => {
            if (result.found) {
                return new RedirectCommand(router.createUrlTree(['/articles', result.articleId]), {
                    replaceUrl: true,
                });
            }
            if (!result.canCreate) {
                return placeholderRedirect();
            }
            return { mode: 'create', articleId: 0, versionId: 0, title, content: '' } as const;
        }),
        catchError(() => of(placeholderRedirect())),
    );
}

export const newArticleResolver: ResolveFn<ArticleEditSession | RedirectCommand> = route =>
    resolveNewArticle(inject(ArticleService), inject(Router), route);
