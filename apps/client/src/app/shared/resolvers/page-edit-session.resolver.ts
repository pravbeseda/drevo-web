import { ArticleService } from '../../services/articles';
import { parsePositiveIntParam, readRouteParam } from '../helpers/route-params';
import { PageEditSession, toEditSession } from '../models/page-edit-session';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { PageKind } from '@drevo-web/shared';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

/**
 * Pure function for resolving the edit session of a version from route params.
 * Reads :versionId and opens that version of the kind, raw, for editing.
 */
export function resolvePageEditSession(
    articleService: ArticleService,
    route: ActivatedRouteSnapshot,
    kind: PageKind,
): Observable<PageEditSession | undefined> {
    const id = parsePositiveIntParam(readRouteParam(route, 'versionId'));
    if (id === undefined) {
        return of(undefined);
    }

    return articleService.getArticleVersion(id, kind).pipe(
        map(version => toEditSession(version, kind)),
        catchError(() => of(undefined)),
    );
}

/** Resolves the edit session of the `:versionId` version of the kind; `undefined` for a bad id or a failed load. */
export function pageEditSessionResolver(kind: PageKind): ResolveFn<PageEditSession | undefined> {
    return route => resolvePageEditSession(inject(ArticleService), route, kind);
}
