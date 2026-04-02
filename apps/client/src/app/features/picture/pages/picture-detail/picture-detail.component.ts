import { AuthService } from '../../../../services/auth/auth.service';
import { PictureLightboxService } from '../../../../services/pictures/picture-lightbox.service';
import { PictureService } from '../../../../services/pictures/picture.service';
import { ErrorComponent } from '../../../../shared/components/error/error.component';
import { SidebarActionComponent } from '../../../../shared/components/sidebar-action/sidebar-action.component';
import { PictureResolveResult } from '../../resolvers/picture.resolver';
import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, ElementRef, inject, PLATFORM_ID, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LoggerService, NotificationService, WINDOW } from '@drevo-web/core';
import { PictureArticle } from '@drevo-web/shared';
import { FormatDatePipe, SpinnerComponent } from '@drevo-web/ui';
import { of, startWith, switchMap } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

const TITLE_MIN_LENGTH = 5;
const TITLE_MAX_LENGTH = 500;

@Component({
    selector: 'app-picture-detail',
    imports: [ErrorComponent, ReactiveFormsModule, SidebarActionComponent, FormatDatePipe, RouterLink, SpinnerComponent],
    templateUrl: './picture-detail.component.html',
    styleUrl: './picture-detail.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PictureDetailComponent {
    private readonly route = inject(ActivatedRoute);
    private readonly authService = inject(AuthService);
    private readonly lightboxService = inject(PictureLightboxService);
    private readonly pictureService = inject(PictureService);
    private readonly notificationService = inject(NotificationService);
    private readonly logger = inject(LoggerService).withContext('PictureDetail');
    private readonly window = inject(WINDOW);
    private readonly platformId = inject(PLATFORM_ID);
    private readonly destroyRef = inject(DestroyRef);

    private readonly titleInputRef = viewChild<ElementRef<HTMLTextAreaElement>>('titleInput');

    private readonly resolveResult = toSignal(
        this.route.data.pipe(map(data => data['picture'] as PictureResolveResult)),
    );

    private readonly user = toSignal(this.authService.user$);

    readonly picture = computed(() => {
        const result = this.resolveResult();
        return typeof result === 'object' ? result : undefined;
    });

    readonly isLoadError = computed(() => this.resolveResult() === 'load-error');

    readonly canEdit = computed(() => this.user()?.permissions.canEdit ?? false);

    // Title inline editing
    readonly titleControl = new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(TITLE_MIN_LENGTH), Validators.maxLength(TITLE_MAX_LENGTH)],
    });

    private readonly _isEditingTitle = signal(false);
    private readonly _isSavingTitle = signal(false);
    private readonly _titleOverride = signal<string | undefined>(undefined);
    private blurHandledByKeyboard = false;

    readonly isEditingTitle = this._isEditingTitle.asReadonly();
    readonly isSavingTitle = this._isSavingTitle.asReadonly();
    readonly displayTitle = computed(() => this._titleOverride() ?? this.picture()?.title ?? '');

    // Articles
    private readonly pictureId = computed(() => this.picture()?.id);

    private readonly articlesResult = toSignal(
        toObservable(this.pictureId).pipe(
            switchMap(id =>
                id
                    ? this.pictureService.getPictureArticles(id).pipe(
                          map(articles => ({ articles, loading: false as const })),
                          startWith({
                              articles: undefined as readonly PictureArticle[] | undefined,
                              loading: true as const,
                          }),
                          catchError((error: unknown) => {
                              this.logger.error('Failed to load articles', error);
                              return of({
                                  articles: undefined as readonly PictureArticle[] | undefined,
                                  loading: false as const,
                              });
                          }),
                      )
                    : of({ articles: undefined as readonly PictureArticle[] | undefined, loading: false as const }),
            ),
        ),
    );

    readonly articles = computed(() => this.articlesResult()?.articles);
    readonly articlesLoading = computed(() => this.articlesResult()?.loading ?? false);

    constructor() {
        effect(() => {
            const el = this.titleInputRef()?.nativeElement;
            if (el) {
                // Auto-size: shrink to 0, then expand to scrollHeight (min 4 rows via CSS)
                el.style.height = '0';
                el.style.height = `${el.scrollHeight}px`;
                el.focus();
                el.select();
            }
        });
    }

    startTitleEdit(): void {
        if (!this.canEdit() || this._isEditingTitle()) return;
        this.titleControl.setValue(this.displayTitle());
        this.titleControl.markAsPristine();
        this._isEditingTitle.set(true);
    }

    cancelTitleEdit(): void {
        if (this._isSavingTitle()) return;
        this.blurHandledByKeyboard = true;
        this._isEditingTitle.set(false);
    }

    onTitleBlur(): void {
        if (this.blurHandledByKeyboard) {
            this.blurHandledByKeyboard = false;
            return;
        }
        if (this.titleControl.invalid) {
            this._isEditingTitle.set(false);
            return;
        }
        this.saveTitleEdit();
    }

    saveTitleEdit(): void {
        if (this.titleControl.invalid || this._isSavingTitle()) return;

        const value = this.titleControl.value.trim();
        const pic = this.picture();
        if (!pic) return;

        if (value === this.displayTitle()) {
            this.cancelTitleEdit();
            return;
        }

        this._isSavingTitle.set(true);
        this.pictureService
            .updateTitle(pic.id, value)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: result => {
                    this._isSavingTitle.set(false);
                    this._isEditingTitle.set(false);
                    if (result.picture) {
                        this._titleOverride.set(result.picture.title);
                        this.notificationService.success('Описание обновлено');
                    } else if (result.pending) {
                        this.notificationService.info('Изменение отправлено на модерацию');
                    }
                    this.logger.info('Title update submitted', { id: pic.id, title: value });
                },
                error: (err: unknown) => {
                    this._isSavingTitle.set(false);
                    this.logger.error('Failed to update title', err);
                    this.notificationService.error('Не удалось обновить описание');
                },
            });
    }

    onTitleEnter(event: Event): void {
        event.preventDefault();
        this.blurHandledByKeyboard = true;
        this.saveTitleEdit();
    }

    autoResizeTextarea(): void {
        const el = this.titleInputRef()?.nativeElement;
        if (el) {
            el.style.height = '0';
            el.style.height = `${el.scrollHeight}px`;
        }
    }

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
