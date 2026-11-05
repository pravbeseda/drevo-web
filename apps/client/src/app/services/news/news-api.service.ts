import { environment } from '../../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ApiResponse, NewsFeedResponseDto, NewsTopicDto, assertIsDefined } from '@drevo-web/shared';
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

    /**
     * Get a page of the published news, newest first.
     *
     * @param topic - Section id; omitted means every section
     * @param page - Page number (1-based)
     * @param pageSize - Number of items per page
     */
    getFeed(topic: number | undefined, page: number, pageSize: number): Observable<NewsFeedResponseDto> {
        let params = new HttpParams().set('page', page.toString()).set('size', pageSize.toString());
        if (topic !== undefined) {
            params = params.set('topic', topic.toString());
        }

        return this.http
            .get<ApiResponse<NewsFeedResponseDto>>(`${this.apiUrl}/api/news/list`, { params, withCredentials: true })
            .pipe(
                map(response => {
                    assertIsDefined(response.data, 'Response data is undefined');
                    return response.data;
                }),
            );
    }

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
}
