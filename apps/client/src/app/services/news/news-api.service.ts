import { environment } from '../../../environments/environment';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { SKIP_ERROR_NOTIFICATION } from '@drevo-web/core';
import {
    ApiResponse,
    CreateArticleResponseDto,
    CreateNewsRequestDto,
    NewsMetaRequestDto,
    NewsListResponseDto,
    NewsListSource,
    NewsMetaResponseDto,
    NewsTopicDto,
    assertIsDefined,
} from '@drevo-web/shared';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Low-level API service for the news-only endpoints. A news item's versions
 * go through ArticleService with the `news` page kind.
 *
 * @internal Use NewsService instead
 */
@Injectable({
    providedIn: 'root',
})
export class NewsApiService {
    private readonly apiUrl = environment.apiUrl;
    private readonly http = inject(HttpClient);

    /** Get the news sections. */
    getTopics(): Observable<readonly NewsTopicDto[]> {
        return this.http
            .get<ApiResponse<readonly NewsTopicDto[]>>(`${this.apiUrl}/api/news/topics`, { withCredentials: true })
            .pipe(
                map(response => {
                    assertIsDefined(response.data, 'Response data is undefined');
                    return response.data;
                }),
            );
    }

    /** Get a page of the published news of the source, newest first. */
    getNewsList(source: NewsListSource, page: number, pageSize: number): Observable<NewsListResponseDto> {
        const sourceParams =
            'articleId' in source
                ? new HttpParams().set('articleId', source.articleId.toString())
                : new HttpParams().set('title', source.title);
        const params = sourceParams.set('page', page.toString()).set('size', pageSize.toString());

        return this.http
            .get<ApiResponse<NewsListResponseDto>>(`${this.apiUrl}/api/news/list`, { params, withCredentials: true })
            .pipe(
                map(response => {
                    assertIsDefined(response.data, 'Response data is undefined');
                    return response.data;
                }),
            );
    }

    /**
     * Create a news item. Errors are not auto-notified — the editor explains them.
     */
    createNews(request: CreateNewsRequestDto): Observable<CreateArticleResponseDto> {
        return this.http
            .post<ApiResponse<CreateArticleResponseDto>>(`${this.apiUrl}/api/news/create`, request, {
                withCredentials: true,
                context: new HttpContext().set(SKIP_ERROR_NOTIFICATION, true),
            })
            .pipe(
                map(response => {
                    assertIsDefined(response.data, 'Response data is undefined');
                    return response.data;
                }),
            );
    }

    /**
     * Change a news item's title, date, section, rank or mailing (moderator only).
     * Errors are not auto-notified — the form explains them.
     */
    updateMeta(newsId: number, request: NewsMetaRequestDto): Observable<NewsMetaResponseDto> {
        return this.http
            .post<ApiResponse<NewsMetaResponseDto>>(`${this.apiUrl}/api/news/${newsId}/meta`, request, {
                withCredentials: true,
                context: new HttpContext().set(SKIP_ERROR_NOTIFICATION, true),
            })
            .pipe(
                map(response => {
                    assertIsDefined(response.data, 'Response data is undefined');
                    return response.data;
                }),
            );
    }
}
