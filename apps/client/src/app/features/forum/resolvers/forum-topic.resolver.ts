import { ForumTopicPageDataService, ForumTopicResolveResult } from '../services/forum-topic-page-data.service';
import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';

/** The topic page's data, shared with the route's title resolver. */
export const forumTopicResolver: ResolveFn<ForumTopicResolveResult> = route =>
    inject(ForumTopicPageDataService).load(route);
