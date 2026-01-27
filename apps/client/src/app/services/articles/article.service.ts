import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
    ArticleVersion,
    ArticleSearchResponseDto,
    ArticleSearchResultDto,
    ArticleSearchResponse,
    ArticleSearchResult,
    ArticleSearchParams,
    ArticleVersionDto,
    SaveArticleVersionRequest,
    SaveArticleVersionResult,
    SaveArticleVersionResponseDto,
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
     * Get article by ID
     *
     * @param id - Article ID
     * @returns Observable with mapped article
     */
    getArticle(id: number): Observable<ArticleVersion> {
        return this.articleApiService.getArticle(id).pipe(
            map(response =>
                this.mapArticleVersion({
                    ...response,
                    content: this.transformArticleLinks(response.content),
                })
            )
        );
    }

    /**
     * Get article version by ID (for editing)
     *
     * @param versionId - Version ID
     * @returns Observable with mapped article version (raw content)
     */
    getArticleVersion(versionId: number): Observable<ArticleVersion> {
        return this.articleApiService
            .getArticleVersion(versionId)
            .pipe(map(response => this.mapArticleVersion(response)));
    }

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

    /**
     * Save article version
     *
     * @param request - Save request with versionId, content, and optional info
     * @returns Observable with mapped save result
     */
    saveArticleVersion(
        request: SaveArticleVersionRequest
    ): Observable<SaveArticleVersionResult> {
        return this.articleApiService
            .saveArticleVersion(request)
            .pipe(map(response => this.mapSaveResponse(response)));
    }

    private mapArticleVersion(response: ArticleVersionDto): ArticleVersion {
        return {
            articleId: response.articleId,
            versionId: response.versionId,
            title: response.title,
            content: response.content,
            author: response.author,
            date: new Date(response.date),
            redirect: response.redirect === 1,
            new: response.new,
            approved: response.approved,
            info: response.info,
            comment: response.comment,
        };
    }

    /**
     * Transform legacy article links to Angular-friendly format.
     * Converts href="/articles/8.html" to href="/articles/8"
     * Converts href="/articles/8.html#S22" to href="/articles/8#S22"
     */
    private transformArticleLinks(content: string): string {
        // Match href attributes pointing to /articles/*.html with optional anchor
        return content.replace(
            /href="\/articles\/(\d+)\.html(#[^"]+)?"/g,
            'href="/articles/$1$2"'
        );
    }

    private mapSearchResponse(
        response: ArticleSearchResponseDto
    ): ArticleSearchResponse {
        return {
            items: response.items.map(item => this.mapSearchResult(item)),
            total: response.total,
            page: response.page,
            pageSize: response.pageSize,
            totalPages: response.totalPages,
        };
    }

    private mapSearchResult(item: ArticleSearchResultDto): ArticleSearchResult {
        return {
            id: item.id,
            title: item.title,
        };
    }

    private mapSaveResponse(
        response: SaveArticleVersionResponseDto
    ): SaveArticleVersionResult {
        return {
            articleId: response.articleId,
            versionId: response.versionId,
            title: response.title,
            author: response.author,
            date: new Date(response.date),
            approved: response.approved,
        };
    }
}
