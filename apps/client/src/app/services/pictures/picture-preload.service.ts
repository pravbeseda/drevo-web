import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { LoggerService } from '@drevo-web/core';
import { Picture } from '@drevo-web/shared';
import { defer, forkJoin, fromEvent, map, Observable, of, race, take, tap, timer } from 'rxjs';

const WAIT_LIMIT_MS = 5000;

@Injectable({ providedIn: 'root' })
export class PicturePreloadService {
    private readonly document = inject(DOCUMENT);
    private readonly logger = inject(LoggerService).withContext('PicturePreloadService');

    /**
     * Emits the page once its thumbnails are in the browser cache. A broken or slow one does not hold
     * the page back. Loads them apart from the DOM: the list renders, and so requests, only the rows in view.
     */
    whenThumbnailsLoaded<T extends { readonly items: readonly Picture[] }>(page: T): Observable<T> {
        if (page.items.length === 0) {
            return of(page);
        }
        const loaded$ = forkJoin(page.items.map(picture => this.imageSettled(picture.thumbnailUrl)));
        const waitLimit$ = timer(WAIT_LIMIT_MS).pipe(
            tap(() => this.logger.warn('Thumbnails took too long, showing the page without them')),
        );
        return race(loaded$, waitLimit$).pipe(map(() => page));
    }

    private imageSettled(url: string): Observable<unknown> {
        return defer(() => {
            const image = this.document.createElement('img');
            image.src = url;
            const failed$ = fromEvent(image, 'error').pipe(
                tap(() => this.logger.warn('Thumbnail failed to load', { url })),
            );
            return race(fromEvent(image, 'load'), failed$).pipe(take(1));
        });
    }
}
