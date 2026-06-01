import { ArticleApiService } from './article-api.service';
import { DEFAULT_ARTICLE_SEARCH_PAGE_SIZE } from './article.constants';
import { Injectable, inject } from '@angular/core';
import { LoggerService } from '@drevo-web/core';
import {
    ApprovalStatus,
    ArticleHistoryItem,
    ArticleHistoryItemDto,
    ArticleHistoryParams,
    ArticleHistoryResponse,
    ArticleHistoryResponseDto,
    ArticleLinkedHereParams,
    ArticleLinkedHereResponse,
    ArticleLinkedHereResponseDto,
    ArticleSearchParams,
    ArticleSearchResponse,
    ArticleSearchResult,
    ArticleSearchResponseDto,
    ArticleSearchResultDto,
    ArticleVersion,
    ArticleVersionDto,
    CancelVersionResult,
    ModerationResult,
    RenameArticleResponse,
    SaveArticleVersionRequest,
    SaveArticleVersionResponseDto,
    SaveArticleVersionResult,
    VersionForDiff,
    VersionForDiffDto,
    VersionPairs,
} from '@drevo-web/shared';
import { Observable, Subject } from 'rxjs';
import { map, tap } from 'rxjs/operators';

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
    private readonly logger = inject(LoggerService).withContext('ArticleService');

    private readonly _renamedSubject = new Subject<RenameArticleResponse>();
    readonly renamed$ = this._renamedSubject.asObservable();

    /**
     * Get article by ID.
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
                }),
            ),
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
                }),
            ),
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
     * Get articles that link to the given article (by title).
     *
     * @param params - Linked-here parameters (title required; query/page/pageSize optional)
     * @returns Observable with mapped linked-here response
     */
    getLinkedHere(params: ArticleLinkedHereParams): Observable<ArticleLinkedHereResponse> {
        const { title, query = '', page = 1, pageSize = DEFAULT_ARTICLE_SEARCH_PAGE_SIZE } = params;

        return this.articleApiService
            .getLinkedHere(title, query, page, pageSize)
            .pipe(map(response => this.mapLinkedHereResponse(response)));
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
     * Moderate article version (approve or reject)
     *
     * @param versionId - Version ID to moderate
     * @param approved - Approval status
     * @param comment - Optional moderation comment
     * @returns Observable with moderation result
     */
    moderateVersion(versionId: number, approved: ApprovalStatus, comment = ''): Observable<ModerationResult> {
        return this.articleApiService.moderateVersion({ versionId, approved, comment }).pipe(
            map(dto => ({
                versionId: dto.versionId,
                articleId: dto.articleId,
                approved: dto.approved,
                comment: dto.comment ?? '',
            })),
        );
    }

    /**
     * Cancel a pending article version (author-only).
     *
     * @param versionId - Version ID to cancel
     * @returns Observable with cancellation result
     */
    cancelVersion(versionId: number): Observable<CancelVersionResult> {
        return this.articleApiService.cancelVersion(versionId).pipe(
            map(dto => ({
                versionId: dto.versionId,
                articleId: dto.articleId,
                approved: dto.approved,
            })),
        );
    }

    /**
     * Preview formatted article content without saving
     *
     * @param content - Raw wiki content to format
     * @param articleId - Article ID for internal links resolution
     * @returns Observable with formatted HTML string (with transformed links)
     */
    previewArticle(content: string, articleId: number): Observable<string> {
        return this.articleApiService
            .previewArticle({ content, articleId })
            .pipe(map(response => this.transformArticleLinks(response.content)));
    }

    getArticlesHistory(params: ArticleHistoryParams = {}): Observable<ArticleHistoryResponse> {
        return this.articleApiService
            .getArticlesHistory(params)
            .pipe(map(response => this.mapHistoryResponse(response)));
    }

    renameArticle(articleId: number, title: string): Observable<RenameArticleResponse> {
        return this.articleApiService.renameArticle(articleId, title).pipe(
            map(dto => {
                this.logger.info('Article renamed', {
                    articleId: dto.articleId,
                    oldTitle: dto.oldTitle,
                    newTitle: dto.title,
                });
                return { articleId: dto.articleId, title: dto.title };
            }),
            tap(result => this._renamedSubject.next(result)),
        );
    }

    updateTopics(articleId: number, topics: readonly number[]): Observable<readonly number[]> {
        return this.articleApiService.updateTopics(articleId, topics);
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
            topics: response.topics ?? [],
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
            highlightedTitle: item.highlightedTitle,
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

    private mapLinkedHereResponse(response: ArticleLinkedHereResponseDto): ArticleLinkedHereResponse {
        return {
            items: response.items.map(item => ({
                id: item.id,
                title: item.title,
                highlightedTitle: item.highlightedTitle,
            })),
            total: response.total,
            page: response.page,
            pageSize: response.pageSize,
            totalPages: response.totalPages,
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
            })),
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
            articleId: dto.articleId,
            versionId: dto.versionId,
            content: dto.content,
            author: dto.author,
            date: new Date(dto.date),
            title: dto.title,
            info: dto.info,
            approved: dto.approved,
            comment: dto.comment ?? '',
        };
    }
}
