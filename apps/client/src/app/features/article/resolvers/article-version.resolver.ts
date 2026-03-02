import { ArticleService } from '../../../services/articles';
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
    const idParam = route.paramMap.get('versionId');
    if (!idParam) {
        return of(undefined);
    }

    const id = Number(idParam);
    if (isNaN(id) || id <= 0) {
        return of(undefined);
    }

    return articleService.getArticleVersion(id).pipe(catchError(() => of(undefined)));
}

export const articleVersionResolver: ResolveFn<ArticleVersion | undefined> = route =>
    resolveArticleVersion(inject(ArticleService), route);
