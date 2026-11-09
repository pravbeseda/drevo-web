import { PictureService } from '../../../services/pictures/picture.service';
import { recoverResolveFailure, ResolveFailure, skipNotFoundToast } from '../../../shared/helpers/resolve-failure';
import { parsePositiveIntParam, readRouteParam } from '../../../shared/helpers/route-params';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { Logger, LoggerService } from '@drevo-web/core';
import { Picture } from '@drevo-web/shared';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export type PictureResolveResult = Picture | ResolveFailure;

/**
 * Pure function for resolving picture data from route params.
 * Extracted for testability without injection context.
 */
export function resolvePicture(
    pictureService: PictureService,
    logger: Logger,
    route: ActivatedRouteSnapshot,
): Observable<PictureResolveResult> {
    const id = parsePositiveIntParam(readRouteParam(route, 'id'));
    if (id === undefined) {
        return of('not-found' as const);
    }

    return pictureService
        .getPicture(id, skipNotFoundToast())
        .pipe(catchError(recoverResolveFailure(logger, `Failed to load the picture ${id}`)));
}

export const pictureResolver: ResolveFn<PictureResolveResult> = route =>
    resolvePicture(inject(PictureService), inject(LoggerService).withContext('PictureResolver'), route);
