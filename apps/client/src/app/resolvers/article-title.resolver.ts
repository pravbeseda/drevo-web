import { ArticleService } from '../services/articles';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

/**
 * Pure function for resolving article title from route params.
 * Calls ArticleService.getArticle(id) directly — in-flight cache in ArticleService
 * guarantees a single HTTP request when used alongside articleResolver.
 */
export function resolveArticleTitle(articleService: ArticleService, route: ActivatedRouteSnapshot): Observable<string> {
    const idParam = route.paramMap.get('id');
    if (!idParam) {
        return of('Статья');
    }

    const id = Number(idParam);
    if (isNaN(id) || id <= 0) {
        return of('Статья');
    }

    return articleService.getArticle(id).pipe(
        map(article => article.title),
        catchError(() => of('Статья'))
    );
}

export const articleTitleResolver: ResolveFn<string> = route => resolveArticleTitle(inject(ArticleService), route);
