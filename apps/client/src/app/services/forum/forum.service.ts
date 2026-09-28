import { ForumApiService } from './forum-api.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { readApiErrorBody } from '@drevo-web/core';
import {
    ForumCreatedTopic,
    ForumMessage,
    ForumMessageDto,
    ForumNewTopic,
    ForumPostedMessage,
    ForumPostedMessageDto,
    ForumPostErrors,
    ForumPostOutcome,
    ForumSection,
    ForumTopic,
    ForumTopicDto,
    ForumTopicListItem,
    ForumTopicListItemDto,
    ForumTopicListResponse,
    ForumTopicListResponseDto,
    ForumTopicPage,
    ForumTopicPageDto,
    parseDate,
} from '@drevo-web/shared';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

/** The status the forum answers a post its rules refuse with. */
const REFUSED_STATUS = 400;
/** The status a `readonly` — banned — account is refused any post with. */
const FORBIDDEN_STATUS = 403;
const FORBIDDEN_MESSAGE = 'Ваш аккаунт ограничен: писать на форуме нельзя.';

/**
 * Domain service for the forum.
 * Maps API DTOs to frontend models.
 */
@Injectable({
    providedIn: 'root',
})
export class ForumService {
    private readonly forumApiService = inject(ForumApiService);

    /**
     * Get the forum sections.
     */
    getSections(): Observable<readonly ForumSection[]> {
        return this.forumApiService.getSections();
    }

    /**
     * Get a page of topics, sticky first.
     */
    getTopics(part?: string, partId?: number, page?: number): Observable<ForumTopicListResponse> {
        return this.forumApiService
            .getTopics(part, partId, page)
            .pipe(map(response => this.mapTopicListResponse(response)));
    }

    /**
     * Get a topic and a page of its messages.
     */
    getTopic(id: number, page?: number, anchor?: number): Observable<ForumTopicPage> {
        return this.forumApiService.getTopic(id, page, anchor).pipe(map(dto => this.mapTopicPage(dto)));
    }

    /**
     * Start a topic. A post the forum refuses is an outcome the form shows,
     * not a failure; anything else still fails the stream.
     */
    createTopic(topic: ForumNewTopic): Observable<ForumPostOutcome<ForumCreatedTopic>> {
        const { partId, ...request } = topic;

        return this.forumApiService.createTopic(partId === undefined ? request : { ...request, partId }).pipe(
            map(dto => this.posted({ ...this.mapPosted(dto), topicId: dto.topicId })),
            catchError((error: unknown) => this.refused<ForumCreatedTopic>(error)),
        );
    }

    /**
     * Reply to a message of the topic, or to the topic itself when `parentId`
     * is absent. Refusals are outcomes, as in `createTopic`.
     */
    reply(
        topicId: number,
        text: string,
        parentId: number | undefined,
    ): Observable<ForumPostOutcome<ForumPostedMessage>> {
        return this.forumApiService.reply(topicId, parentId === undefined ? { text } : { text, parentId }).pipe(
            map(dto => this.posted(this.mapPosted(dto))),
            catchError((error: unknown) => this.refused<ForumPostedMessage>(error)),
        );
    }

    private posted<T>(result: T): ForumPostOutcome<T> {
        return { status: 'posted', result };
    }

    private refused<T>(error: unknown): Observable<ForumPostOutcome<T>> {
        if (!(error instanceof HttpErrorResponse)) {
            return throwError(() => error);
        }
        if (error.status === FORBIDDEN_STATUS) {
            return of({ status: 'rejected', errors: { title: undefined, text: undefined, other: FORBIDDEN_MESSAGE } });
        }
        if (error.status !== REFUSED_STATUS) {
            return throwError(() => error);
        }

        return of({ status: 'rejected', errors: this.mapPostErrors(error) });
    }

    /**
     * `data.errors` is keyed by the request's field names, a list of messages
     * each; a refusal without it — an unknown section, a malformed body — is
     * explained by its message alone.
     */
    private mapPostErrors(response: HttpErrorResponse): ForumPostErrors {
        const fieldErrors = this.readFieldErrors(response.error);
        const { title, text, ...others } = fieldErrors;
        const otherField = Object.values(others).find(message => message !== undefined);
        const hasFieldErrors = Object.keys(fieldErrors).length > 0;

        return { title, text, other: hasFieldErrors ? otherField : readApiErrorBody(response)?.error };
    }

    private readFieldErrors(body: unknown): Readonly<Record<string, string | undefined>> {
        const data: unknown = typeof body === 'object' && body && 'data' in body ? body.data : undefined;
        const errors: unknown = typeof data === 'object' && data && 'errors' in data ? data.errors : undefined;
        if (typeof errors !== 'object' || !errors) {
            return {};
        }

        return Object.fromEntries(
            Object.entries(errors).map(([field, messages]: [string, unknown]) => [
                field,
                Array.isArray(messages) && typeof messages[0] === 'string' ? messages[0] : undefined,
            ]),
        );
    }

    private mapPosted(dto: ForumPostedMessageDto): ForumPostedMessage {
        return { message: this.mapMessage(dto.message), approved: dto.approved };
    }

    private mapTopicListResponse(response: ForumTopicListResponseDto): ForumTopicListResponse {
        return {
            items: response.items.map(item => this.mapTopicListItem(item)),
            total: response.total,
            page: response.page,
            pageSize: response.pageSize,
            totalPages: response.totalPages,
        };
    }

    private mapTopicListItem(dto: ForumTopicListItemDto): ForumTopicListItem {
        return {
            id: dto.id,
            title: dto.title,
            lastPostAt: this.mapDate(dto.lastPostAt),
            pinned: dto.pinned,
            author: dto.author,
            article: dto.article ?? undefined,
            section: dto.section ?? undefined,
        };
    }

    private mapTopicPage(dto: ForumTopicPageDto): ForumTopicPage {
        return {
            topic: this.mapTopic(dto.topic),
            messages: {
                items: dto.messages.items.map(item => this.mapMessage(item)),
                total: dto.messages.total,
                page: dto.messages.page,
                pageSize: dto.messages.pageSize,
                totalPages: dto.messages.totalPages,
            },
        };
    }

    private mapTopic(dto: ForumTopicDto): ForumTopic {
        return {
            id: dto.id,
            title: dto.title,
            part: dto.part,
            partId: this.mapId(dto.partId),
            article: dto.article ?? undefined,
            author: dto.author,
            createdAt: this.mapDate(dto.createdAt),
            repliesCount: dto.repliesCount,
        };
    }

    private mapMessage(dto: ForumMessageDto): ForumMessage {
        return {
            id: dto.id,
            parentId: this.mapId(dto.parentId),
            author: {
                name: dto.author.name,
                login: dto.author.login,
            },
            createdAt: this.mapDate(dto.createdAt),
            html: dto.html,
        };
    }

    /** The wire's columns are `NOT NULL DEFAULT 0`, so `0` is the absence of an id. */
    private mapId(id: number): number | undefined {
        return id > 0 ? id : undefined;
    }

    private mapDate(value: string | null): Date | undefined {
        return value ? parseDate(value) : undefined;
    }
}
