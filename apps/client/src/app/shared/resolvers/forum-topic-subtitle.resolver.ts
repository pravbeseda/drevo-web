import { PageSubtitle } from '../../services/page-title.strategy';
import { forumOwnerKind, forumOwnerPrefix } from '../helpers/forum-owner';
import { pageUrl } from '../helpers/page-kind';
import { ForumTopicPageDataService } from '../services/forum-topic-page/forum-topic-page-data.service';
import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { map } from 'rxjs/operators';

/** The line under the topic's title naming, and linking, the article or news item it hangs off. */
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
                    link: pageUrl(forumOwnerKind(part), article.id),
                };
            }),
        );
