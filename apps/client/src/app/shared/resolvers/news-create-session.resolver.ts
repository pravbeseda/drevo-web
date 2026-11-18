import { ArticleService } from '../../services/articles';
import { AuthService } from '../../services/auth/auth.service';
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
    readonly authService: AuthService;
    readonly articleService: ArticleService;
    readonly notificationService: NotificationService;
    readonly isBrowser: boolean;
    readonly router: Router;
    readonly logger: Logger;
}

export function injectNewsCreateDeps(): NewsCreateDeps {
    return {
        authService: inject(AuthService),
        articleService: inject(ArticleService),
        notificationService: inject(NotificationService),
        isBrowser: isPlatformBrowser(inject(PLATFORM_ID)),
        router: inject(Router),
        logger: inject(LoggerService).withContext('NewsCreateSessionResolver'),
    };
}

/**
 * The edit session of a news item not created yet. A reader without the right
 * to edit, which /api/news/create requires, or past the limit of unapproved
 * news, is sent back to the origin rather than to an editor whose save would
 * fail; the limit is the server's to judge, and a refusal says why.
 *
 * `authGuard` has waited for the user before any resolver runs. The server
 * knows no user and lets every route through, so the browser's own navigation
 * makes the check.
 */
export function resolveNewsCreateSession(
    origin: NewsCreateOrigin,
    newsTopics$: Observable<readonly NewsTopic[]>,
    deps: NewsCreateDeps,
): Observable<PageEditSession | RedirectCommand> {
    const { authService, articleService, notificationService, isBrowser, router, logger } = deps;
    const sendBack = () => new RedirectCommand(router.parseUrl(origin.exitUrl), { replaceUrl: true });
    const mayCreate = !isBrowser || (authService.currentUser?.permissions.canEdit ?? false);
    if (!mayCreate) {
        logger.warn('News creation denied: no right to edit', origin);
        return of(sendBack());
    }
    const refusal$ = isBrowser ? editorRefusal(articleService, 'news') : of(undefined);
    return forkJoin([newsTopics$, refusal$]).pipe(
        map(([newsTopics, refusal]): PageEditSession | RedirectCommand => {
            if (refusal) {
                reportEditorRefusal(notificationService, logger, refusal, { kind: 'news' });
                return sendBack();
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
