import { DEFAULT_ARTICLE_SEARCH_PAGE_SIZE } from './article.constants';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { SKIP_ERROR_NOTIFICATION } from '@drevo-web/core';
import {
    ApiResponse,
    ArticleSearchResponseDto,
    ArticleVersionDto,
    SaveArticleVersionRequestDto,
    SaveArticleVersionResponseDto,
    assertIsDefined,
} from '@drevo-web/shared';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

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
     * Get article by ID
     *
     * @param id - Article ID
     * @returns Observable with raw API response
     */
    getArticle(id: number): Observable<ArticleVersionDto> {
        return this.http
            .get<
                ApiResponse<ArticleVersionDto>
            >(`${this.apiUrl}/api/articles/show/${id}`, { withCredentials: true })
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

    /**
     * Get article version by ID (for editing)
     *
     * @param versionId - Version ID
     * @returns Observable with raw API response containing version details
     */
    getArticleVersion(versionId: number): Observable<ArticleVersionDto> {
        return this.http
            .get<
                ApiResponse<ArticleVersionDto>
            >(`${this.apiUrl}/api/articles/version/${versionId}`, { withCredentials: true })
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
    ): Observable<ArticleSearchResponseDto> {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('size', pageSize.toString());

        const trimmedQuery = query.trim();
        if (trimmedQuery) {
            params = params.set('q', trimmedQuery);
        }

        return this.http
            .get<
                ApiResponse<ArticleSearchResponseDto>
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

    /**
     * Save article version
     *
     * @param request - Save request with versionId, content, and optional info
     * @returns Observable with raw API response
     */
    saveArticleVersion(
        request: SaveArticleVersionRequestDto
    ): Observable<SaveArticleVersionResponseDto> {
        const context = new HttpContext().set(SKIP_ERROR_NOTIFICATION, true);

        return this.http
            .post<
                ApiResponse<SaveArticleVersionResponseDto>
            >(`${this.apiUrl}/api/articles/save`, request, { withCredentials: true, context })
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
