import { ArticleService } from '../../services/articles';
import { recoverResolveFailure, ResolveFailure } from '../helpers/resolve-failure';
import { parsePositiveIntParam, readRouteParam } from '../helpers/route-params';
import { PageEditSession, toEditSession } from '../models/page-edit-session';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { Logger, LoggerService } from '@drevo-web/core';
import { PageKind } from '@drevo-web/shared';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export type PageEditSessionResolveResult = PageEditSession | ResolveFailure;

/**
 * Pure function for resolving the edit session of a version from route params.
 * Reads :versionId and opens that version of the kind, raw, for editing.
 */
export function resolvePageEditSession(
    articleService: ArticleService,
    logger: Logger,
    route: ActivatedRouteSnapshot,
    kind: PageKind,
): Observable<PageEditSessionResolveResult> {
    const id = parsePositiveIntParam(readRouteParam(route, 'versionId'));
    if (id === undefined) {
        return of('not-found' as const);
    }

    return articleService.getArticleVersion(id, kind).pipe(
        map(version => toEditSession(version, kind)),
        catchError(recoverResolveFailure(logger, `Failed to load the ${kind} version ${id}`)),
    );
}

/** Resolves the edit session of the `:versionId` version of the kind. */
export function pageEditSessionResolver(kind: PageKind): ResolveFn<PageEditSessionResolveResult> {
    return route =>
        resolvePageEditSession(
            inject(ArticleService),
            inject(LoggerService).withContext('PageEditSessionResolver'),
            route,
            kind,
        );
}
