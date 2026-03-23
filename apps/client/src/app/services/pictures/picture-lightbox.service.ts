import { PictureService } from './picture.service';
import { Location } from '@angular/common';
import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoggerService, WINDOW } from '@drevo-web/core';
import { Picture } from '@drevo-web/shared';
import { fromEvent } from 'rxjs';

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

    /** Whether the lightbox was closed by popstate (Back button) — prevents double history manipulation */
    private closedByPopstate = false;

    constructor() {
        this.listenPopstate();
    }

    open(pictureId: number): void {
        this.logger.info('Opening lightbox', { pictureId });

        this._isOpen.set(true);
        this._isLoading.set(true);
        this._isZoomed.set(false);
        this._currentPicture.set(undefined);
        this.closedByPopstate = false;

        this.pushHash(pictureId);

        this.pictureService
            .getPicture(pictureId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: picture => {
                    this._currentPicture.set(picture);
                    this._isLoading.set(false);
                },
                error: error => {
                    this.logger.error('Failed to load picture', error);
                    this._isLoading.set(false);
                    this.close();
                },
            });
    }

    close(): void {
        if (!this._isOpen()) {
            return;
        }

        this.logger.info('Closing lightbox');
        this._isOpen.set(false);
        this._currentPicture.set(undefined);
        this._isLoading.set(false);
        this._isZoomed.set(false);

        if (!this.closedByPopstate) {
            this.removeHash();
        }
        this.closedByPopstate = false;
    }

    toggleZoom(): void {
        this._isZoomed.update(v => !v);
    }

    private pushHash(pictureId: number): void {
        const currentPath = this.location.path(false);
        this.location.go(`${currentPath}${HASH_PREFIX}${pictureId}`);
    }

    private removeHash(): void {
        const currentPath = this.location.path(false);
        this.location.replaceState(currentPath);
    }

    private listenPopstate(): void {
        if (!this.window) {
            return;
        }

        fromEvent(this.window, 'popstate')
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
                if (this._isOpen()) {
                    this.closedByPopstate = true;
                    this.close();
                }
            });
    }
}
