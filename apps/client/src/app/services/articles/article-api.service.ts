import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse, ArticleSearchResponseApi } from '@drevo-web/shared';
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
     * @param query - Search query string
     * @param page - Page number (1-based)
     * @param pageSize - Number of items per page
     * @returns Observable with raw API response
     */
    searchArticles(
        query: string,
        page = 1,
        pageSize = DEFAULT_ARTICLE_SEARCH_PAGE_SIZE
    ): Observable<ArticleSearchResponseApi> {
        const params = new HttpParams()
            .set('q', query)
            .set('page', page.toString())
            .set('size', pageSize.toString());

        return this.http
            .get<
                ApiResponse<ArticleSearchResponseApi>
            >(`${this.apiUrl}/api/articles/search`, { params, withCredentials: true })
            .pipe(map(response => response.data!));
    }
}
