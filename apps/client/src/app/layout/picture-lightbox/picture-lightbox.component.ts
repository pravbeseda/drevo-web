import { PictureLightboxService } from '../../services/pictures/picture-lightbox.service';
import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, HostListener, inject, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { LoggerService } from '@drevo-web/core';
import { IconButtonComponent, SpinnerComponent } from '@drevo-web/ui';
import { filter, fromEvent } from 'rxjs';

@Component({
    selector: 'app-picture-lightbox',
    imports: [IconButtonComponent, SpinnerComponent],
    templateUrl: './picture-lightbox.component.html',
    styleUrl: './picture-lightbox.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PictureLightboxComponent {
    protected readonly lightboxService = inject(PictureLightboxService);
    private readonly router = inject(Router);
    private readonly document = inject(DOCUMENT);
    private readonly destroyRef = inject(DestroyRef);
    private readonly logger = inject(LoggerService).withContext('PictureLightbox');

    private readonly backdropEl = viewChild<ElementRef<HTMLElement>>('backdropEl');

    constructor() {
        this.listenFullscreenChange();
    }

    @HostListener('document:keydown.escape')
    onEscape(): void {
        if (!this.lightboxService.isZoomed()) {
            this.lightboxService.close();
        }
    }

    onBackdropClick(event: MouseEvent): void {
        if ((event.target as HTMLElement).classList.contains('lightbox__backdrop')) {
            this.lightboxService.close();
        }
    }

    onImageClick(): void {
        const willZoom = !this.lightboxService.isZoomed();
        this.lightboxService.toggleZoom();

        if (willZoom) {
            this.enterFullscreen();
        } else {
            this.exitFullscreen();
        }
    }

    openDetailPage(): void {
        const picture = this.lightboxService.currentPicture();
        if (picture) {
            this.logger.info('Navigating to picture detail', { id: picture.id });
            this.exitFullscreen();
            this.lightboxService.close();
            void this.router.navigate(['/pictures', picture.id]);
        }
    }

    private enterFullscreen(): void {
        const el = this.backdropEl()?.nativeElement;
        if (el?.requestFullscreen && !this.document.fullscreenElement) {
            el.requestFullscreen().catch(() => {
                // Fullscreen may be blocked by browser policy — zoom still works without it
            });
        }
    }

    private exitFullscreen(): void {
        if (this.document.fullscreenElement) {
            this.document.exitFullscreen().catch(() => {});
        }
    }

    private listenFullscreenChange(): void {
        fromEvent(this.document, 'fullscreenchange')
            .pipe(
                filter(() => !this.document.fullscreenElement && this.lightboxService.isZoomed()),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(() => {
                this.lightboxService.toggleZoom();
            });
    }
}
