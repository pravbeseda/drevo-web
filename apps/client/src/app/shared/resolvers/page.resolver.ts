import { ArticleService } from '../../services/articles';
import { recoverResolveFailure, ResolveFailure } from '../helpers/resolve-failure';
import { parsePositiveIntParam, readRouteParam } from '../helpers/route-params';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { Logger, LoggerService } from '@drevo-web/core';
import { ArticleVersion, PageKind } from '@drevo-web/shared';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export type PageResolveResult = ArticleVersion | ResolveFailure;

/**
 * Pure function for resolving an article or a news item from route params.
 * Extracted for testability without injection context.
 */
export function resolvePage(
    articleService: ArticleService,
    logger: Logger,
    route: ActivatedRouteSnapshot,
    kind: PageKind,
): Observable<PageResolveResult> {
    const id = parsePositiveIntParam(readRouteParam(route, 'id'));
    if (id === undefined) {
        return of('not-found' as const);
    }

    return articleService
        .getArticle(id, kind)
        .pipe(catchError(recoverResolveFailure(logger, `Failed to load the ${kind} page ${id}`)));
}

/** Resolves the `:id` page of the kind. */
export function pageResolver(kind: PageKind): ResolveFn<PageResolveResult> {
    return route => resolvePage(inject(ArticleService), inject(LoggerService).withContext('PageResolver'), route, kind);
}
