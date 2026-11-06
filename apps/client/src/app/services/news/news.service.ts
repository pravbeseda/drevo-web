import { NewsApiService } from './news-api.service';
import { NEWS_LIST_PAGE_SIZE } from './news.constants';
import { Injectable, inject } from '@angular/core';
import {
    CreateNewsRequest,
    NewsListPage,
    NewsListSource,
    NewsMeta,
    NewsMetaChange,
    NewsTopic,
    SaveArticleVersionResult,
    parseCalendarDate,
    parseDate,
} from '@drevo-web/shared';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/** The news-only endpoints: sections, the news of an article or of a title without one, creation, the moderator's meta; a news item's versions go through ArticleService with the `news` page kind. */
@Injectable({
    providedIn: 'root',
})
export class NewsService {
    private readonly newsApiService = inject(NewsApiService);

    getTopics(): Observable<readonly NewsTopic[]> {
        return this.newsApiService.getTopics();
    }

    getNewsList(source: NewsListSource, page = 1): Observable<NewsListPage> {
        return this.newsApiService.getNewsList(source, page, NEWS_LIST_PAGE_SIZE).pipe(
            map(response => ({
                items: response.items.map(item => ({
                    id: item.id,
                    title: item.title,
                    newsDate: item.newsDate ? parseCalendarDate(item.newsDate) : undefined,
                })),
                total: response.total,
            })),
        );
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
            })),
        );
    }
}
