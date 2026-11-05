import { NewsApiService } from './news-api.service';
import { NEWS_FEED_PAGE_SIZE } from './news.constants';
import { Injectable, inject } from '@angular/core';
import {
    CreateNewsRequest,
    NewsFeedItem,
    NewsFeedItemDto,
    NewsFeedParams,
    NewsFeedResponse,
    NewsMeta,
    NewsMetaChange,
    NewsTopic,
    SaveArticleVersionResult,
    parseCalendarDate,
    parseDate,
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

    createNews(request: CreateNewsRequest): Observable<SaveArticleVersionResult> {
        return this.newsApiService.createNews(request).pipe(
            map(response => ({
                articleId: response.articleId,
                versionId: response.versionId,
                title: response.title,
                author: response.author,
                date: parseDate(response.date),
                approved: response.approved,
            })),
        );
    }

    updateMeta(newsId: number, change: NewsMetaChange): Observable<NewsMeta> {
        return this.newsApiService.updateMeta(newsId, change).pipe(
            map(response => ({
                articleId: response.articleId,
                title: response.title,
                newsDate: response.newsDate ? parseCalendarDate(response.newsDate) : undefined,
                topics: response.topics,
                rank: response.rank,
                numlist: response.numlist,
            })),
        );
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
