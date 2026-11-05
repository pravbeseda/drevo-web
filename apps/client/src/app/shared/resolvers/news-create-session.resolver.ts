import { AuthService } from '../../services/auth/auth.service';
import { PageEditSession } from '../models/page-edit-session';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';
import { RedirectCommand, Router } from '@angular/router';
import { Logger, LoggerService } from '@drevo-web/core';
import { NewsTopic } from '@drevo-web/shared';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

/** Where a news item is created from: the editor leaves back there, and its draft is kept under its own key. */
export interface NewsCreateOrigin {
    readonly exitUrl: string;
    readonly draftKey: string;
}

export interface NewsCreateDeps {
    readonly authService: AuthService;
    readonly isBrowser: boolean;
    readonly router: Router;
    readonly logger: Logger;
}

export function injectNewsCreateDeps(): NewsCreateDeps {
    return {
        authService: inject(AuthService),
        isBrowser: isPlatformBrowser(inject(PLATFORM_ID)),
        router: inject(Router),
        logger: inject(LoggerService).withContext('NewsCreateSessionResolver'),
    };
}

/**
 * The edit session of a news item not created yet. A reader without the right
 * to edit, which /api/news/create requires, is sent back to the origin rather
 * than to an editor whose save would fail.
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
    const { authService, isBrowser, router, logger } = deps;
    const mayCreate = !isBrowser || (authService.currentUser?.permissions.canEdit ?? false);
    if (!mayCreate) {
        logger.warn('News creation denied: no right to edit', origin);
        return of(new RedirectCommand(router.parseUrl(origin.exitUrl), { replaceUrl: true }));
    }
    return newsTopics$.pipe(
        map((newsTopics): PageEditSession => ({
            kind: 'news',
            mode: 'create',
            articleId: 0,
            versionId: 0,
            title: '',
            content: '',
            exitUrl: origin.exitUrl,
            draftKey: origin.draftKey,
            newsTopics,
        })),
    );
}
