import { PictureLightboxService } from '../../../../services/pictures/picture-lightbox.service';
import { ErrorComponent } from '../../../../shared/components/error/error.component';
import { SidebarActionComponent } from '../../../../shared/components/sidebar-action/sidebar-action.component';
import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, PLATFORM_ID } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { LoggerService, NotificationService, WINDOW } from '@drevo-web/core';
import { Picture } from '@drevo-web/shared';
import { FormatDatePipe } from '@drevo-web/ui';
import { map } from 'rxjs/operators';

@Component({
    selector: 'app-picture-detail',
    imports: [ErrorComponent, SidebarActionComponent, FormatDatePipe],
    templateUrl: './picture-detail.component.html',
    styleUrl: './picture-detail.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PictureDetailComponent {
    private readonly route = inject(ActivatedRoute);
    private readonly lightboxService = inject(PictureLightboxService);
    private readonly notificationService = inject(NotificationService);
    private readonly logger = inject(LoggerService).withContext('PictureDetail');
    private readonly window = inject(WINDOW);
    private readonly platformId = inject(PLATFORM_ID);

    private readonly routeData = toSignal(this.route.data.pipe(map(data => data['picture'] as Picture | undefined)));

    readonly picture = computed(() => this.routeData());

    onImageClick(): void {
        const pic = this.picture();
        if (pic) {
            this.logger.info('Opening lightbox from detail', { id: pic.id });
            this.lightboxService.open(pic.id);
        }
    }

    editPicture(): void {
        this.notificationService.info('Функция еще не реализована');
    }

    copyInsertCode(): void {
        const pic = this.picture();
        if (!pic || !isPlatformBrowser(this.platformId)) {
            return;
        }

        const code = `@${pic.id}@`;
        this.window?.navigator.clipboard.writeText(code).then(() => {
            this.notificationService.success('Код скопирован');
            this.logger.info('Insert code copied', { id: pic.id, code });
        });
    }
}
