import { PictureService } from '../../../services/pictures/picture.service';
import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { Picture } from '@drevo-web/shared';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

const NOT_FOUND_STATUS = 404;

export type PictureResolveResult = Picture | 'not-found' | 'load-error';

/**
 * Pure function for resolving picture data from route params.
 * Extracted for testability without injection context.
 */
export function resolvePicture(
    pictureService: PictureService,
    route: ActivatedRouteSnapshot,
): Observable<PictureResolveResult> {
    const idParam = route.paramMap.get('id');
    if (!idParam) {
        return of('not-found' as const);
    }

    const id = Number(idParam);
    if (isNaN(id) || id <= 0 || !Number.isInteger(id)) {
        return of('not-found' as const);
    }

    return pictureService.getPicture(id).pipe(
        catchError((error: unknown) => {
            if (error instanceof HttpErrorResponse && error.status === NOT_FOUND_STATUS) {
                return of('not-found' as const);
            }
            return of('load-error' as const);
        }),
    );
}

export const pictureResolver: ResolveFn<PictureResolveResult> = route => resolvePicture(inject(PictureService), route);
