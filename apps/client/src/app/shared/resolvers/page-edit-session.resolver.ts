import { ArticleService } from '../../services/articles';
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
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

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
 * A refusal lands on the page itself, as the legacy editor does; from the page,
 * that is the address the reader already is at, so they stay where they clicked.
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
        map(([session, refusal]) => {
            if (typeof session === 'string' || !refusal) {
                return session;
            }
            reportEditorRefusal(notificationService, logger, refusal, { kind, versionId: id });
            return new RedirectCommand(router.parseUrl(pageUrl(kind, session.articleId)), { replaceUrl: true });
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
