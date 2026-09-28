import { environment } from '../../../environments/environment';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { SKIP_ERROR_FOR_STATUSES } from '@drevo-web/core';
import {
    ApiResponse,
    ForumCreatedTopicDto,
    ForumCreateTopicRequestDto,
    ForumPostedMessageDto,
    ForumReplyRequestDto,
    ForumSectionDto,
    ForumTopicListResponseDto,
    ForumTopicPageDto,
    assertIsDefined,
} from '@drevo-web/shared';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

const VALIDATION_FAILURE_STATUS = 400;
const FORBIDDEN_STATUS = 403;

/**
 * Low-level API service for forum-related HTTP requests.
 *
 * A parameter the caller leaves out is not sent at all: the backend reads an
 * empty `part` and a `partId` of 0 as "every section", so an empty value on
 * the query would say something the caller did not mean. `size` is never
 * sent — the server's own page size decides, and the response carries it.
 *
 * A post the forum's rules refuse (400) or a restricted account may not make
 * (403) is explained under the form, so the writes keep both statuses away
 * from the error toast.
 *
 * @internal Use ForumService instead
 */
@Injectable({
    providedIn: 'root',
})
export class ForumApiService {
    private readonly apiUrl = environment.apiUrl;
    private readonly http = inject(HttpClient);

    /**
     * Get the forum sections.
     */
    getSections(): Observable<readonly ForumSectionDto[]> {
        return this.http
            .get<ApiResponse<readonly ForumSectionDto[]>>(`${this.apiUrl}/api/forum/sections`, {
                withCredentials: true,
            })
            .pipe(
                map(response => {
                    assertIsDefined(response.data, 'Response data is undefined');
                    return response.data;
                }),
            );
    }

    /**
     * Get a page of topics, sticky first.
     *
     * @param part - Section text id; omitted means every section
     * @param partId - Id the section is bound to (an article, say); omitted means every one
     * @param page - Page number (1-based); omitted means the first
     */
    getTopics(part?: string, partId?: number, page?: number): Observable<ForumTopicListResponseDto> {
        let params = new HttpParams();
        if (part) {
            params = params.set('part', part);
        }
        if (partId) {
            params = params.set('partId', partId);
        }
        if (page) {
            params = params.set('page', page);
        }

        return this.http
            .get<ApiResponse<ForumTopicListResponseDto>>(`${this.apiUrl}/api/forum/topics`, {
                params,
                withCredentials: true,
            })
            .pipe(
                map(response => {
                    assertIsDefined(response.data, 'Response data is undefined');
                    return response.data;
                }),
            );
    }

    /**
     * Get a topic and a page of its messages.
     *
     * @param id - Topic id
     * @param page - Page number (1-based); omitted means the first
     * @param anchor - Message id to land on; overrides `page` on the server
     */
    getTopic(id: number, page?: number, anchor?: number): Observable<ForumTopicPageDto> {
        let params = new HttpParams();
        if (page) {
            params = params.set('page', page);
        }
        if (anchor) {
            params = params.set('anchor', anchor);
        }

        return this.http
            .get<ApiResponse<ForumTopicPageDto>>(`${this.apiUrl}/api/forum/topics/${id}`, {
                params,
                withCredentials: true,
            })
            .pipe(
                map(response => {
                    assertIsDefined(response.data, 'Response data is undefined');
                    return response.data;
                }),
            );
    }

    /**
     * Start a topic with its first message.
     */
    createTopic(request: ForumCreateTopicRequestDto): Observable<ForumCreatedTopicDto> {
        return this.http
            .post<ApiResponse<ForumCreatedTopicDto>>(`${this.apiUrl}/api/forum/topics`, request, {
                withCredentials: true,
                context: this.writeContext(),
            })
            .pipe(
                map(response => {
                    assertIsDefined(response.data, 'Response data is undefined');
                    return response.data;
                }),
            );
    }

    /**
     * Reply in a topic, to one of its messages or to the topic itself.
     */
    reply(topicId: number, request: ForumReplyRequestDto): Observable<ForumPostedMessageDto> {
        return this.http
            .post<ApiResponse<ForumPostedMessageDto>>(`${this.apiUrl}/api/forum/topics/${topicId}/messages`, request, {
                withCredentials: true,
                context: this.writeContext(),
            })
            .pipe(
                map(response => {
                    assertIsDefined(response.data, 'Response data is undefined');
                    return response.data;
                }),
            );
    }

    private writeContext(): HttpContext {
        return new HttpContext().set(SKIP_ERROR_FOR_STATUSES, [VALIDATION_FAILURE_STATUS, FORBIDDEN_STATUS]);
    }
}
