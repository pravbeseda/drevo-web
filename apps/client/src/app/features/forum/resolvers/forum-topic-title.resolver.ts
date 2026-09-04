import { ForumTopicPageDataService } from '../services/forum-topic-page-data.service';
import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { map } from 'rxjs/operators';

/** The title of a topic that could not be loaded is the forum it belongs to. */
const FALLBACK_TITLE = 'Форум';

/**
 * The topic's own title, taken from the load the data resolver shares — a
 * `data: { titleSource }` cannot serve here, because `PageTitleStrategy` reads
 * `data[titleSource].title` and the resolved page keeps the title one level
 * deeper, at `.topic.title`.
 */
export const forumTopicTitleResolver: ResolveFn<string> = route =>
    inject(ForumTopicPageDataService)
        .load(route)
        .pipe(map(result => (typeof result === 'object' ? result.topic.title : FALLBACK_TITLE)));
