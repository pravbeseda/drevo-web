import { ArticleService } from '../../services/articles';
import { isPageContentPath, primaryPath } from '../helpers/content-tab';
import { pageUrl } from '../helpers/page-kind';
import { recoverResolveFailure, ResolveFailure } from '../helpers/resolve-failure';
import { parsePositiveIntParam, readRouteParam } from '../helpers/route-params';
import { PageEditSession, toEditSession } from '../models/page-edit-session';
import { editorRefusal, reportEditorRefusal } from './editor-access';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';
import { ActivatedRouteSnapshot, RedirectCommand, ResolveFn, Router } from '@angular/router';
import { Logger, LoggerService, NotificationService } from '@drevo-web/core';
import { PageKind } from '@drevo-web/shared';
import { EMPTY, Observable, forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

export type PageEditSessionResolveResult = PageEditSession | ResolveFailure;

export interface PageEditSessionDeps {
    readonly articleService: ArticleService;
    readonly notificationService: NotificationService;
    readonly router: Router;
    readonly logger: Logger;
    readonly isBrowser: boolean;
}

/**
 * Pure function for resolving the edit session of a version from route params.
 * Reads :versionId and opens that version of the kind, raw, for editing, once
 * the server allows the user to: the rights and the limit of unapproved edits
 * gate the opening of the editor, not the save.
 *
 * A refusal leaves a reader who clicked «Редактировать» on the page or one of its
 * versions where they are, address unchanged; one who came from anywhere else —
 * the sign-in, an address typed in — lands on the page, as the legacy editor does.
 * The server knows no user and leaves the check to the browser's navigation.
 */
export function resolvePageEditSession(
    deps: PageEditSessionDeps,
    route: ActivatedRouteSnapshot,
    kind: PageKind,
): Observable<PageEditSessionResolveResult | RedirectCommand> {
    const { articleService, notificationService, router, logger, isBrowser } = deps;
    const id = parsePositiveIntParam(readRouteParam(route, 'versionId'));
    if (id === undefined) {
        return of('not-found' as const);
    }

    const session$ = articleService.getArticleVersion(id, kind).pipe(
        map(version => toEditSession(version, kind)),
        catchError(recoverResolveFailure(logger, `Failed to load the ${kind} version ${id}`)),
    );
    if (!isBrowser) {
        return session$;
    }

    return forkJoin([session$, editorRefusal(articleService, kind, id)]).pipe(
        switchMap(([session, refusal]) => {
            if (typeof session === 'string' || !refusal) {
                return of(session);
            }
            reportEditorRefusal(notificationService, logger, refusal, { kind, versionId: id });
            const page = pageUrl(kind, session.articleId);
            const current = primaryPath(router, router.url);
            // A resolver that completes empty cancels the navigation.
            return current !== undefined && isPageContentPath(current, page)
                ? EMPTY
                : of(new RedirectCommand(router.parseUrl(page)));
        }),
    );
}

/** Resolves the edit session of the `:versionId` version of the kind. */
export function pageEditSessionResolver(kind: PageKind): ResolveFn<PageEditSessionResolveResult> {
    return route =>
        resolvePageEditSession(
            {
                articleService: inject(ArticleService),
                notificationService: inject(NotificationService),
                router: inject(Router),
                logger: inject(LoggerService).withContext('PageEditSessionResolver'),
                isBrowser: isPlatformBrowser(inject(PLATFORM_ID)),
            },
            route,
            kind,
        );
}
