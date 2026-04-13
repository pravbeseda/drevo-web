import { PictureService } from './picture.service';
import { Location } from '@angular/common';
import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoggerService, WINDOW } from '@drevo-web/core';
import { Picture } from '@drevo-web/shared';
import { catchError, EMPTY, fromEvent, Subject, switchMap } from 'rxjs';

const HASH_PREFIX = '#picture=';

@Injectable({
    providedIn: 'root',
})
export class PictureLightboxService {
    private readonly pictureService = inject(PictureService);
    private readonly location = inject(Location);
    private readonly window = inject(WINDOW);
    private readonly destroyRef = inject(DestroyRef);
    private readonly logger = inject(LoggerService).withContext('PictureLightbox');

    private readonly _isOpen = signal(false);
    private readonly _currentPicture = signal<Picture | undefined>(undefined);
    private readonly _isLoading = signal(false);
    private readonly _isZoomed = signal(false);

    readonly isOpen = this._isOpen.asReadonly();
    readonly currentPicture = this._currentPicture.asReadonly();
    readonly isLoading = this._isLoading.asReadonly();
    readonly isZoomed = this._isZoomed.asReadonly();

    /** Whether we pushed a hash entry that needs to be cleaned up on close */
    private hashPushed = false;

    private readonly _openSubject = new Subject<number>();

    constructor() {
        this.listenPopstate();
        this.listenOpen();
    }

    open(pictureId: number): void {
        this.logger.info('Opening lightbox', { pictureId });

        const wasOpen = this._isOpen();

        this._isOpen.set(true);
        this._isLoading.set(true);
        this._isZoomed.set(false);
        this._currentPicture.set(undefined);

        this.updateHash(pictureId, wasOpen);
        this.hashPushed = true;
        this._openSubject.next(pictureId);
    }

    /**
     * Open lightbox with a pre-loaded picture (skips API fetch).
     * Useful when the caller already has the up-to-date picture data
     * (e.g. after file replacement with cache-busted URL).
     */
    openWithPicture(picture: Picture): void {
        this.logger.info('Opening lightbox with preloaded picture', { pictureId: picture.id });

        const wasOpen = this._isOpen();

        this._isOpen.set(true);
        this._isLoading.set(false);
        this._isZoomed.set(false);
        this._currentPicture.set(picture);

        this.updateHash(picture.id, wasOpen);
        this.hashPushed = true;
    }

    private listenOpen(): void {
        this._openSubject
            .pipe(
                switchMap(pictureId =>
                    this.pictureService.getPicture(pictureId).pipe(
                        catchError(error => {
                            this.logger.error('Failed to load picture', error);
                            this._isLoading.set(false);
                            this.close();
                            return EMPTY;
                        })
                    )
                ),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(picture => {
                if (!this._isOpen()) {
                    return;
                }
                this._currentPicture.set(picture);
                this._isLoading.set(false);
            });
    }

    close(): void {
        this.closeInternal(true);
    }

    /**
     * Close without navigating back in history.
     * Use when the caller handles navigation itself (e.g. routerLink).
     */
    closeWithoutNavigation(): void {
        this.closeInternal(false);
    }

    private closeInternal(navigateBack: boolean): void {
        if (!this._isOpen()) {
            return;
        }

        this.logger.info('Closing lightbox');
        this._isOpen.set(false);
        this._currentPicture.set(undefined);
        this._isLoading.set(false);
        this._isZoomed.set(false);

        if (this.hashPushed) {
            this.hashPushed = false;
            if (navigateBack) {
                this.location.back();
            }
        }
    }

    toggleZoom(): void {
        this._isZoomed.update(v => !v);
    }

    /** Push or replace the hash depending on whether the lightbox is already open */
    private updateHash(pictureId: number, replace: boolean): void {
        const currentPath = this.location.path(false);
        const url = `${currentPath}${HASH_PREFIX}${pictureId}`;

        if (replace) {
            this.location.replaceState(url);
        } else {
            this.location.go(url);
        }
    }

    private listenPopstate(): void {
        if (!this.window) {
            return;
        }

        fromEvent(this.window, 'popstate')
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
                if (this._isOpen()) {
                    this.hashPushed = false;
                    this.close();
                }
            });
    }
}
