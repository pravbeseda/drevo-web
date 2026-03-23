import { PictureLightboxService } from '../../services/pictures/picture-lightbox.service';
import { ChangeDetectionStrategy, Component, HostListener, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LoggerService } from '@drevo-web/core';
import { IconButtonComponent, SpinnerComponent } from '@drevo-web/ui';

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
    private readonly logger = inject(LoggerService).withContext('PictureLightbox');

    @HostListener('document:keydown.escape')
    onEscape(): void {
        this.lightboxService.close();
    }

    onBackdropClick(event: MouseEvent): void {
        if ((event.target as HTMLElement).classList.contains('lightbox__backdrop')) {
            this.lightboxService.close();
        }
    }

    onImageClick(): void {
        this.lightboxService.toggleZoom();
    }

    openDetailPage(): void {
        const picture = this.lightboxService.currentPicture();
        if (picture) {
            this.logger.info('Navigating to picture detail', { id: picture.id });
            this.lightboxService.close();
            void this.router.navigate(['/pictures', picture.id]);
        }
    }
}
