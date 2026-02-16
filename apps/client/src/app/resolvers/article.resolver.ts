import { ArticleService } from '../services/articles';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { ArticleVersion } from '@drevo-web/shared';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

/**
 * Pure function for resolving article data from route params.
 * Extracted for testability without injection context.
 */
export function resolveArticle(
    articleService: ArticleService,
    route: ActivatedRouteSnapshot
): Observable<ArticleVersion | undefined> {
    const id = Number(route.paramMap.get('id'));

    if (isNaN(id) || id <= 0) {
        return of(undefined);
    }

    return articleService.getArticle(id).pipe(catchError(() => of(undefined)));
}

export const articleResolver: ResolveFn<ArticleVersion | undefined> = route =>
    resolveArticle(inject(ArticleService), route);
