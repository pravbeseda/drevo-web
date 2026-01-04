import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
    ApiResponse,
    ArticleSearchResponseApi,
    assertIsDefined,
} from '@drevo-web/shared';
import { environment } from '../../../environments/environment';
import { DEFAULT_ARTICLE_SEARCH_PAGE_SIZE } from './article.constants';

/**
 * Low-level API service for article-related HTTP requests.
 *
 * IMPORTANT: This service should NOT be used directly by components or other services.
 * All article-related operations should go through ArticleService, which handles
 * data mapping and additional business logic.
 *
 * @internal Use ArticleService instead
 */
@Injectable({
    providedIn: 'root',
})
export class ArticleApiService {
    private readonly apiUrl = environment.apiUrl;
    private readonly http = inject(HttpClient);

    /**
     * Search articles by title
     *
     * @param query - Search query string (empty string returns all articles)
     * @param page - Page number (1-based)
     * @param pageSize - Number of items per page
     * @returns Observable with raw API response
     */
    searchArticles(
        query = '',
        page = 1,
        pageSize = DEFAULT_ARTICLE_SEARCH_PAGE_SIZE
    ): Observable<ArticleSearchResponseApi> {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('size', pageSize.toString());

        const trimmedQuery = query.trim();
        if (trimmedQuery) {
            params = params.set('q', trimmedQuery);
        }

        return this.http
            .get<
                ApiResponse<ArticleSearchResponseApi>
            >(`${this.apiUrl}/api/articles/search`, { params, withCredentials: true })
            .pipe(
                map(response => {
                    assertIsDefined(
                        response.data,
                        'Response data is undefined'
                    );
                    return response.data;
                })
            );
    }
}
