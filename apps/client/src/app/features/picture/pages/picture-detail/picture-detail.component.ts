import { PictureLightboxService } from '../../../../services/pictures/picture-lightbox.service';
import { PictureService } from '../../../../services/pictures/picture.service';
import { ErrorComponent } from '../../../../shared/components/error/error.component';
import { SidebarActionComponent } from '../../../../shared/components/sidebar-action/sidebar-action.component';
import { PictureResolveResult } from '../../resolvers/picture.resolver';
import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, PLATFORM_ID } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LoggerService, NotificationService, WINDOW } from '@drevo-web/core';
import { PictureArticle } from '@drevo-web/shared';
import { FormatDatePipe } from '@drevo-web/ui';
import { of, startWith, switchMap } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Component({
    selector: 'app-picture-detail',
    imports: [ErrorComponent, SidebarActionComponent, FormatDatePipe, RouterLink],
    templateUrl: './picture-detail.component.html',
    styleUrl: './picture-detail.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PictureDetailComponent {
    private readonly route = inject(ActivatedRoute);
    private readonly lightboxService = inject(PictureLightboxService);
    private readonly pictureService = inject(PictureService);
    private readonly notificationService = inject(NotificationService);
    private readonly logger = inject(LoggerService).withContext('PictureDetail');
    private readonly window = inject(WINDOW);
    private readonly platformId = inject(PLATFORM_ID);

    private readonly resolveResult = toSignal(
        this.route.data.pipe(map(data => data['picture'] as PictureResolveResult)),
    );

    readonly picture = computed(() => {
        const result = this.resolveResult();
        return typeof result === 'object' ? result : undefined;
    });

    readonly isLoadError = computed(() => this.resolveResult() === 'load-error');

    private readonly pictureId = computed(() => this.picture()?.id);

    private readonly articlesResult = toSignal(
        toObservable(this.pictureId).pipe(
            switchMap(id =>
                id
                    ? this.pictureService.getPictureArticles(id).pipe(
                          map(articles => ({ articles, loading: false as const })),
                          startWith({ articles: undefined as readonly PictureArticle[] | undefined, loading: true as const }),
                          catchError((error: unknown) => {
                              this.logger.error('Failed to load articles', error);
                              return of({ articles: undefined as readonly PictureArticle[] | undefined, loading: false as const });
                          }),
                      )
                    : of({ articles: undefined as readonly PictureArticle[] | undefined, loading: false as const }),
            ),
        ),
    );

    readonly articles = computed(() => this.articlesResult()?.articles);
    readonly articlesLoading = computed(() => this.articlesResult()?.loading ?? false);

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
        this.window?.navigator?.clipboard
            .writeText(code)
            .then(() => {
                this.notificationService.success('Код скопирован');
                this.logger.info('Insert code copied', { id: pic.id, code });
            })
            .catch((error: unknown) => {
                this.logger.error('Failed to copy insert code', error);
                this.notificationService.error(`Не удалось скопировать код ${code}`);
            });
    }
}
