import { PictureService } from '../../../services/pictures/picture.service';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn, Router } from '@angular/router';
import { Picture } from '@drevo-web/shared';
import { EMPTY, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

/**
 * Pure function for resolving picture data from route params.
 * Extracted for testability without injection context.
 */
export function resolvePicture(
    pictureService: PictureService,
    router: Router,
    route: ActivatedRouteSnapshot
): Observable<Picture | undefined> {
    const idParam = route.paramMap.get('id');
    if (!idParam) {
        router.navigate(['/pictures']);
        return EMPTY;
    }

    const id = Number(idParam);
    if (isNaN(id) || id <= 0) {
        router.navigate(['/pictures']);
        return EMPTY;
    }

    return pictureService.getPicture(id).pipe(catchError(() => of(undefined)));
}

export const pictureResolver: ResolveFn<Picture | undefined> = route =>
    resolvePicture(inject(PictureService), inject(Router), route);
