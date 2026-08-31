import { ArticleService } from '../../../services/articles';
import { parsePositiveIntParam } from '../../../shared/helpers/route-params';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { ArticleVersion } from '@drevo-web/shared';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

/**
 * Pure function for resolving article version data from route params.
 * Reads :versionId param and calls getArticleVersion().
 */
export function resolveArticleVersion(
    articleService: ArticleService,
    route: ActivatedRouteSnapshot,
): Observable<ArticleVersion | undefined> {
    const id = parsePositiveIntParam(route.paramMap.get('versionId') ?? undefined);
    if (id === undefined) {
        return of(undefined);
    }

    return articleService.getArticleVersion(id).pipe(catchError(() => of(undefined)));
}

export const articleVersionResolver: ResolveFn<ArticleVersion | undefined> = route =>
    resolveArticleVersion(inject(ArticleService), route);
