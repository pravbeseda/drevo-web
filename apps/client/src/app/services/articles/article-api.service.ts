import { DEFAULT_ARTICLE_SEARCH_PAGE_SIZE } from './article.constants';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { SKIP_ERROR_NOTIFICATION } from '@drevo-web/core';
import {
    ApiResponse,
    ApprovalStatusDto,
    ArticleHistoryResponseDto,
    ArticlePreviewRequestDto,
    ArticlePreviewResponseDto,
    ArticleSearchResponseDto,
    ArticleVersionDto,
    ModerationRequestDto,
    ModerationResponseDto,
    SaveArticleVersionRequestDto,
    SaveArticleVersionResponseDto,
    VersionPairsResponseDto,
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
            .get<ApiResponse<ArticleVersionDto>>(`${this.apiUrl}/api/articles/show/${id}`, { withCredentials: true })
            .pipe(
                map(response => {
                    assertIsDefined(response.data, 'Response data is undefined');
                    return response.data;
                })
            );
    }

    /**
     * Get article version for viewing (with formatted HTML content)
     *
     * @param versionId - Version ID
     * @returns Observable with raw API response containing version details
     */
    getVersionShow(versionId: number): Observable<ArticleVersionDto> {
        return this.http
            .get<
                ApiResponse<ArticleVersionDto>
            >(`${this.apiUrl}/api/articles/version-show/${versionId}`, { withCredentials: true })
            .pipe(
                map(response => {
                    assertIsDefined(response.data, 'Response data is undefined');
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
                    assertIsDefined(response.data, 'Response data is undefined');
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
        let params = new HttpParams().set('page', page.toString()).set('size', pageSize.toString());

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
                    assertIsDefined(response.data, 'Response data is undefined');
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
    saveArticleVersion(request: SaveArticleVersionRequestDto): Observable<SaveArticleVersionResponseDto> {
        const context = new HttpContext().set(SKIP_ERROR_NOTIFICATION, true);

        return this.http
            .post<
                ApiResponse<SaveArticleVersionResponseDto>
            >(`${this.apiUrl}/api/articles/save`, request, { withCredentials: true, context })
            .pipe(
                map(response => {
                    assertIsDefined(response.data, 'Response data is undefined');
                    return response.data;
                })
            );
    }

    /**
     * Get article version history
     *
     * @param page - Page number (1-based)
     * @param pageSize - Number of items per page
     * @param approved - Optional approval status filter (-1, 0, 1)
     * @param author - Optional author login filter
     * @returns Observable with raw API response
     */
    getArticlesHistory(
        page = 1,
        pageSize = DEFAULT_ARTICLE_SEARCH_PAGE_SIZE,
        approved?: ApprovalStatusDto,
        author?: string,
        articleId?: number
    ): Observable<ArticleHistoryResponseDto> {
        let params = new HttpParams().set('page', page.toString()).set('size', pageSize.toString());

        if (approved !== undefined) {
            params = params.set('approved', approved.toString());
        }

        if (author) {
            params = params.set('author', author);
        }

        if (articleId !== undefined) {
            params = params.set('articleId', articleId.toString());
        }

        return this.http
            .get<
                ApiResponse<ArticleHistoryResponseDto>
            >(`${this.apiUrl}/api/articles/history`, { params, withCredentials: true })
            .pipe(
                map(response => {
                    assertIsDefined(response.data, 'Response data is undefined');
                    return response.data;
                })
            );
    }

    /**
     * Moderate article version (approve or reject)
     *
     * @param request - Moderation request with versionId, approved status, and optional comment
     * @returns Observable with moderation response
     */
    moderateVersion(request: ModerationRequestDto): Observable<ModerationResponseDto> {
        return this.http
            .post<ApiResponse<ModerationResponseDto>>(`${this.apiUrl}/api/articles/moderate`, request, {
                withCredentials: true,
            })
            .pipe(
                map(response => {
                    assertIsDefined(response.data, 'Response data is undefined');
                    return response.data;
                })
            );
    }

    /**
     * Preview formatted article content without saving
     *
     * @param request - Preview request with content and articleId
     * @returns Observable with formatted HTML content
     */
    previewArticle(request: ArticlePreviewRequestDto): Observable<ArticlePreviewResponseDto> {
        return this.http
            .post<ApiResponse<ArticlePreviewResponseDto>>(`${this.apiUrl}/api/articles/preview`, request, {
                withCredentials: true,
                context: new HttpContext().set(SKIP_ERROR_NOTIFICATION, true),
            })
            .pipe(
                map(response => {
                    assertIsDefined(response.data, 'Response data is undefined');
                    return response.data;
                })
            );
    }

    /**
     * Get two versions for diff comparison
     *
     * @param version1 - Primary version ID
     * @param version2 - Optional secondary version ID (auto-detected if omitted)
     * @returns Observable with version pairs DTO
     */
    getVersionPairs(version1: number, version2?: number): Observable<VersionPairsResponseDto> {
        let params = new HttpParams().set('version1', version1.toString());

        if (version2 !== undefined) {
            params = params.set('version2', version2.toString());
        }

        return this.http
            .get<ApiResponse<VersionPairsResponseDto>>(`${this.apiUrl}/api/articles/versionpairs`, {
                params,
                withCredentials: true,
                context: new HttpContext().set(SKIP_ERROR_NOTIFICATION, true),
            })
            .pipe(
                map(response => {
                    assertIsDefined(response.data, 'Response data is undefined');
                    return response.data;
                })
            );
    }
}
