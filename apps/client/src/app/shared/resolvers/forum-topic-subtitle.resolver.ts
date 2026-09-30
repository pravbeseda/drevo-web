import { PageSubtitle } from '../../services/page-title.strategy';
import { forumOwnerPrefix } from '../helpers/forum-owner';
import { ForumTopicPageDataService } from '../services/forum-topic-page/forum-topic-page-data.service';
import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { map } from 'rxjs/operators';

/**
 * The line under the topic's title naming the article or news item it hangs
 * off. A news item is an article to the backend, so both link to `/articles/:id`.
 */
export const forumTopicSubtitleResolver: ResolveFn<PageSubtitle | undefined> = route =>
    inject(ForumTopicPageDataService)
        .load(route)
        .pipe(
            map(result => {
                if (typeof result !== 'object' || !result.topic.article) {
                    return undefined;
                }
                const { part, article } = result.topic;
                return {
                    prefix: forumOwnerPrefix(part),
                    label: article.title,
                    link: `/articles/${article.id}`,
                };
            }),
        );
