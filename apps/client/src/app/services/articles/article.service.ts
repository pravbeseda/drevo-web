import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
    ArticleSearchResponseApi,
    ArticleSearchResultApi,
    ArticleSearchResponse,
    ArticleSearchResult,
    ArticleSearchParams,
} from '@drevo-web/shared';
import { ArticleApiService } from './article-api.service';
import { DEFAULT_ARTICLE_SEARCH_PAGE_SIZE } from './article.constants';

/**
 * Main service for article-related operations.
 *
 * This service is the single point of access for all article operations.
 * It uses ArticleApiService internally for HTTP requests and handles
 * data mapping from API models to frontend models.
 */
@Injectable({
    providedIn: 'root',
})
export class ArticleService {
    private readonly articleApiService = inject(ArticleApiService);

    /**
     * Search articles by title
     *
     * @param params - Search parameters (query is optional - empty returns all articles)
     * @returns Observable with mapped search response
     */
    searchArticles(
        params: ArticleSearchParams = {}
    ): Observable<ArticleSearchResponse> {
        const {
            query = '',
            page = 1,
            pageSize = DEFAULT_ARTICLE_SEARCH_PAGE_SIZE,
        } = params;

        return this.articleApiService
            .searchArticles(query, page, pageSize)
            .pipe(map(response => this.mapSearchResponse(response)));
    }

    private mapSearchResponse(
        response: ArticleSearchResponseApi
    ): ArticleSearchResponse {
        return {
            items: response.items.map(item => this.mapSearchResult(item)),
            total: response.total,
            page: response.page,
            pageSize: response.pageSize,
            totalPages: response.totalPages,
        };
    }

    private mapSearchResult(item: ArticleSearchResultApi): ArticleSearchResult {
        return {
            id: item.id,
            title: item.title,
        };
    }
}
