import { ArticleApiService } from './article-api.service';
import { DEFAULT_ARTICLE_SEARCH_PAGE_SIZE } from './article.constants';
import { Injectable, inject } from '@angular/core';
import {
    ArticleHistoryItem,
    ArticleHistoryItemDto,
    ArticleHistoryParams,
    ArticleHistoryResponse,
    ArticleHistoryResponseDto,
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
    VersionForDiff,
    VersionForDiffDto,
    VersionPairs,
} from '@drevo-web/shared';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

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
     * Get article version for viewing (with formatted HTML and transformed links)
     *
     * @param versionId - Version ID
     * @returns Observable with mapped article version
     */
    getVersionShow(versionId: number): Observable<ArticleVersion> {
        return this.articleApiService.getVersionShow(versionId).pipe(
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
    searchArticles(params: ArticleSearchParams = {}): Observable<ArticleSearchResponse> {
        const { query = '', page = 1, pageSize = DEFAULT_ARTICLE_SEARCH_PAGE_SIZE } = params;

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
    saveArticleVersion(request: SaveArticleVersionRequest): Observable<SaveArticleVersionResult> {
        return this.articleApiService.saveArticleVersion(request).pipe(map(response => this.mapSaveResponse(response)));
    }

    /**
     * Get article version history
     *
     * @param params - History parameters (page, pageSize, approved, author)
     * @returns Observable with mapped history response
     */
    getArticlesHistory(params: ArticleHistoryParams = {}): Observable<ArticleHistoryResponse> {
        const { page = 1, pageSize = DEFAULT_ARTICLE_SEARCH_PAGE_SIZE, approved, author, articleId } = params;

        return this.articleApiService
            .getArticlesHistory(page, pageSize, approved, author, articleId)
            .pipe(map(response => this.mapHistoryResponse(response)));
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
        return content.replace(/href="\/articles\/(\d+)\.html(#[^"]+)?"/g, 'href="/articles/$1$2"');
    }

    private mapSearchResponse(response: ArticleSearchResponseDto): ArticleSearchResponse {
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

    private mapSaveResponse(response: SaveArticleVersionResponseDto): SaveArticleVersionResult {
        return {
            articleId: response.articleId,
            versionId: response.versionId,
            title: response.title,
            author: response.author,
            date: new Date(response.date),
            approved: response.approved,
        };
    }

    private mapHistoryResponse(response: ArticleHistoryResponseDto): ArticleHistoryResponse {
        return {
            items: response.items.map(item => this.mapHistoryItem(item)),
            total: response.total,
            page: response.page,
            pageSize: response.pageSize,
            totalPages: response.totalPages,
        };
    }

    /**
     * Get two versions for diff comparison
     *
     * @param version1 - Primary version ID
     * @param version2 - Optional secondary version ID (auto-detected if omitted)
     * @returns Observable with mapped version pairs
     */
    getVersionPairs(version1: number, version2?: number): Observable<VersionPairs> {
        return this.articleApiService.getVersionPairs(version1, version2).pipe(
            map(response => ({
                current: this.mapVersionForDiff(response.current),
                previous: this.mapVersionForDiff(response.previous),
            }))
        );
    }

    private mapHistoryItem(item: ArticleHistoryItemDto): ArticleHistoryItem {
        return {
            versionId: item.versionId,
            articleId: item.articleId,
            title: item.title,
            author: item.author,
            date: new Date(item.date),
            approved: item.approved,
            isNew: item.new,
            info: item.info,
            comment: item.comment,
        };
    }

    private mapVersionForDiff(dto: VersionForDiffDto): VersionForDiff {
        return {
            versionId: dto.versionId,
            content: dto.content,
            author: dto.author,
            date: new Date(dto.date),
            title: dto.title,
            info: dto.info,
        };
    }
}
