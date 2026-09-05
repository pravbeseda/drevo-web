import { ForumApiService } from './forum-api.service';
import { Injectable, inject } from '@angular/core';
import {
    ForumMessage,
    ForumMessageDto,
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
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

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
            author: dto.author,
            createdAt: this.mapDate(dto.createdAt),
            repliesCount: dto.repliesCount,
            lastPostId: this.mapId(dto.lastPostId),
            lastPostAt: this.mapDate(dto.lastPostAt),
            pinned: dto.pinned,
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
