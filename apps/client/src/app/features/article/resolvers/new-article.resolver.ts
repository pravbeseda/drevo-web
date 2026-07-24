import { ArticleService } from '../../../services/articles';
import { ArticleEditSession } from '../models/article-edit-session';
import { MISSING_ARTICLE_ID } from '../models/missing-article';
import { ArticlePageService } from '../services/article-page.service';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, RedirectCommand, ResolveFn, Router } from '@angular/router';
import { Logger, LoggerService } from '@drevo-web/core';
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
 * (child) legitimately need the title-derived state.
 *
 * When creation is denied, the redirect back to the placeholder is a same-URL
 * navigation (the `/edit` child never committed), so it neither re-runs the
 * parent resolver nor re-emits its data — the placeholder would keep a stale
 * `canCreate: true` and the "create" button would loop. So on denial we push the
 * fresh state straight into the shared `ArticlePageService` (the same instance
 * the placeholder uses, provided by the parent route), which reactively hides
 * the button; the redirect then just keeps the user on the placeholder.
 *
 * The two resolvers never issue conflicting redirects: when `found`, both
 * redirect to the same `/articles/:id`; when not found, the parent returns data
 * (never redirects) while only this child may redirect (to the placeholder).
 */
export function resolveNewArticle(
    articleService: ArticleService,
    router: Router,
    logger: Logger,
    pageService: ArticlePageService,
    route: ActivatedRouteSnapshot,
): Observable<ArticleEditSession | RedirectCommand> {
    // `:title` lives on the parent route — child routes do not inherit params
    // under the default `emptyOnly` inheritance strategy. The router already
    // percent-decodes the param and the segment carries the title verbatim
    // (backend emits rawurlencode), so no further transform is needed.
    const title = route.paramMap.get('title') ?? route.parent?.paramMap.get('title') ?? '';

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
                // Refresh the placeholder's state — the same-URL redirect below
                // won't re-run the parent resolver, so update it directly.
                pageService.setMissing({
                    articleId: MISSING_ARTICLE_ID,
                    title,
                    canCreate: false,
                    reason: result.reason,
                });
                return placeholderRedirect();
            }
            return { mode: 'create', articleId: 0, versionId: 0, title, content: '' } as const;
        }),
        catchError(error => {
            // Re-check failed (network/contract) — log it (repo convention: no
            // silent failures). The redirect back to the placeholder is same-URL,
            // so it won't re-run the parent resolver: without touching the shared
            // state the placeholder would keep a stale `canCreate: true` and the
            // "create" button would loop silently. Push an error into the shared
            // `ArticlePageService` (mirroring the denial branch) — this clears the
            // missing state, so the button hides and the user sees the load-error.
            logger.error('Failed to re-check title before create', error);
            pageService.setError('Ошибка загрузки статьи');
            return of(placeholderRedirect());
        }),
    );
}

export const newArticleResolver: ResolveFn<ArticleEditSession | RedirectCommand> = route =>
    resolveNewArticle(
        inject(ArticleService),
        inject(Router),
        inject(LoggerService).withContext('NewArticleResolver'),
        inject(ArticlePageService),
        route,
    );
