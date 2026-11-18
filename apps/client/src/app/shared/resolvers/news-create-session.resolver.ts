import { ArticleService } from '../../services/articles';
import { PageEditSession } from '../models/page-edit-session';
import { editorRefusal, reportEditorRefusal } from './editor-access';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';
import { RedirectCommand, Router } from '@angular/router';
import { Logger, LoggerService, NotificationService } from '@drevo-web/core';
import { NewsTopic } from '@drevo-web/shared';
import { Observable, forkJoin, of } from 'rxjs';
import { map } from 'rxjs/operators';

/** Where a news item is created from: the editor leaves back there, and its draft is kept under its own key. */
export interface NewsCreateOrigin {
    readonly exitUrl: string;
    readonly draftKey: string;
}

export interface NewsCreateDeps {
    readonly articleService: ArticleService;
    readonly notificationService: NotificationService;
    readonly isBrowser: boolean;
    readonly router: Router;
    readonly logger: Logger;
}

export function injectNewsCreateDeps(): NewsCreateDeps {
    return {
        articleService: inject(ArticleService),
        notificationService: inject(NotificationService),
        isBrowser: isPlatformBrowser(inject(PLATFORM_ID)),
        router: inject(Router),
        logger: inject(LoggerService).withContext('NewsCreateSessionResolver'),
    };
}

/**
 * The edit session of a news item not created yet. A reader the server will not
 * let create one — without the right to edit, or past the limit of unapproved
 * news — is sent back to the origin with the server's reason, rather than to an
 * editor whose save would fail.
 *
 * The server render knows no user and leaves the check to the browser's own
 * navigation.
 */
export function resolveNewsCreateSession(
    origin: NewsCreateOrigin,
    newsTopics$: Observable<readonly NewsTopic[]>,
    deps: NewsCreateDeps,
): Observable<PageEditSession | RedirectCommand> {
    const { articleService, notificationService, isBrowser, router, logger } = deps;
    const refusal$ = isBrowser ? editorRefusal(articleService, 'news') : of(undefined);
    return forkJoin([newsTopics$, refusal$]).pipe(
        map(([newsTopics, refusal]): PageEditSession | RedirectCommand => {
            if (refusal) {
                reportEditorRefusal(notificationService, logger, refusal, { kind: 'news' });
                return new RedirectCommand(router.parseUrl(origin.exitUrl));
            }
            return {
                kind: 'news',
                mode: 'create',
                articleId: 0,
                versionId: 0,
                title: '',
                content: '',
                exitUrl: origin.exitUrl,
                draftKey: origin.draftKey,
                newsTopics,
            };
        }),
    );
}
