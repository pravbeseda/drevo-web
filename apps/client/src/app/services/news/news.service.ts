import { NewsApiService } from './news-api.service';
import { NEWS_FEED_PAGE_SIZE } from './news.constants';
import { Injectable, inject } from '@angular/core';
import {
    NewsFeedItem,
    NewsFeedItemDto,
    NewsFeedParams,
    NewsFeedResponse,
    NewsTopic,
    parseCalendarDate,
} from '@drevo-web/shared';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/** The news feed and its sections; a news item's versions go through ArticleService with the `news` page kind. */
@Injectable({
    providedIn: 'root',
})
export class NewsService {
    private readonly newsApiService = inject(NewsApiService);

    getFeed(params: NewsFeedParams = {}): Observable<NewsFeedResponse> {
        const { topic, page = 1, pageSize = NEWS_FEED_PAGE_SIZE } = params;

        return this.newsApiService.getFeed(topic, page, pageSize).pipe(
            map(response => ({
                items: response.items.map(item => this.mapFeedItem(item)),
                total: response.total,
                page: response.page,
                totalPages: response.totalPages,
            })),
        );
    }

    getTopics(): Observable<readonly NewsTopic[]> {
        return this.newsApiService.getTopics();
    }

    private mapFeedItem(item: NewsFeedItemDto): NewsFeedItem {
        return {
            id: item.id,
            title: item.title,
            newsDate: item.newsDate ? parseCalendarDate(item.newsDate) : undefined,
            topics: item.topics,
        };
    }
}
