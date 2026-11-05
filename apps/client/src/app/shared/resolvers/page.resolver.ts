import { ArticleService } from '../../services/articles';
import { parsePositiveIntParam, readRouteParam } from '../helpers/route-params';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { ArticleVersion, PageKind } from '@drevo-web/shared';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

/**
 * Pure function for resolving an article or a news item from route params.
 * Extracted for testability without injection context.
 */
export function resolvePage(
    articleService: ArticleService,
    route: ActivatedRouteSnapshot,
    kind: PageKind,
): Observable<ArticleVersion | undefined> {
    const id = parsePositiveIntParam(readRouteParam(route, 'id'));
    if (id === undefined) {
        return of(undefined);
    }

    return articleService.getArticle(id, kind).pipe(catchError(() => of(undefined)));
}

/** Resolves the `:id` page of the kind; `undefined` stands for a bad id or a failed load. */
export function pageResolver(kind: PageKind): ResolveFn<ArticleVersion | undefined> {
    return route => resolvePage(inject(ArticleService), route, kind);
}
