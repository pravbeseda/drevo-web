import { AuthService } from '../../../../services/auth/auth.service';
import { PictureLightboxService } from '../../../../services/pictures/picture-lightbox.service';
import { PictureService } from '../../../../services/pictures/picture.service';
import { ErrorComponent } from '../../../../shared/components/error/error.component';
import { SidebarActionComponent } from '../../../../shared/components/sidebar-action/sidebar-action.component';
import { PendingBannerComponent } from '../../components/pending-banner/pending-banner.component';
import {
    ReplaceFileDialogData,
    ReplaceFileDialogResult,
} from '../../components/replace-file-dialog/replace-file-dialog.component';
import { TITLE_MAX_LENGTH, TITLE_MIN_LENGTH } from '../../constants/picture.constants';
import { PendingAction } from '../../models/pending.model';
import { PictureResolveResult } from '../../resolvers/picture.resolver';
import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    effect,
    ElementRef,
    inject,
    PLATFORM_ID,
    signal,
    viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LoggerService, NotificationService, WINDOW } from '@drevo-web/core';
import { Picture, PictureArticle, PicturePending } from '@drevo-web/shared';
import { ConfirmationService, FormatDatePipe, ModalService, SpinnerComponent } from '@drevo-web/ui';
import { merge, Observable, of, startWith, Subject, switchMap } from 'rxjs';
import { catchError, filter, finalize, map, tap } from 'rxjs/operators';

const MAX_FILE_SIZE_BYTES = 500 * 1024;
const ALLOWED_FILE_TYPE = 'image/jpeg';

@Component({
    selector: 'app-picture-detail',
    imports: [
        ErrorComponent,
        ReactiveFormsModule,
        SidebarActionComponent,
        PendingBannerComponent,
        FormatDatePipe,
        RouterLink,
        SpinnerComponent,
    ],
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
    private readonly modalService = inject(ModalService);
    private readonly confirmationService = inject(ConfirmationService);
    private readonly router = inject(Router);
    private readonly logger = inject(LoggerService).withContext('PictureDetail');
    private readonly window = inject(WINDOW);
    private readonly platformId = inject(PLATFORM_ID);
    private readonly destroyRef = inject(DestroyRef);

    private readonly titleInputRef = viewChild<ElementRef<HTMLTextAreaElement>>('titleInput');
    private readonly fileInputRef = viewChild<ElementRef<HTMLInputElement>>('fileInput');

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
    readonly canModerate = computed(() => this.user()?.permissions.canModerate ?? false);
    readonly currentUserName = computed(() => this.user()?.name ?? '');

    // Title inline editing
    readonly titleControl = new FormControl('', {
        nonNullable: true,
        validators: [
            Validators.required,
            Validators.minLength(TITLE_MIN_LENGTH),
            Validators.maxLength(TITLE_MAX_LENGTH),
        ],
    });

    private readonly _isEditingTitle = signal(false);
    private readonly _isSavingTitle = signal(false);
    private readonly _titleOverride = signal<string | undefined>(undefined);
    private blurHandledByKeyboard = false;

    readonly isEditingTitle = this._isEditingTitle.asReadonly();
    readonly isSavingTitle = this._isSavingTitle.asReadonly();
    readonly displayTitle = computed(() => this._titleOverride() ?? this.picture()?.title ?? '');

    // File replacement
    private readonly _isUploading = signal(false);
    private readonly _imageOverride = signal<string | undefined>(undefined);
    readonly isUploading = this._isUploading.asReadonly();
    readonly displayImageUrl = computed(() => this._imageOverride() ?? this.picture()?.imageUrl ?? '');

    // Deletion
    private readonly _isDeleting = signal(false);
    readonly isDeleting = this._isDeleting.asReadonly();

    // Articles
    private readonly pictureId = computed(() => this.picture()?.id);
    private readonly _refreshPendingSubject = new Subject<void>();
    private readonly _pendingActionInProgress = signal<number | undefined>(undefined);
    readonly pendingActionInProgress = this._pendingActionInProgress.asReadonly();

    readonly pendingChanges = toSignal(
        merge(toObservable(this.pictureId), this._refreshPendingSubject.pipe(map(() => this.pictureId()))).pipe(
            switchMap(id =>
                id
                    ? this.pictureService.getPicturePending(id).pipe(
                          catchError((error: unknown) => {
                              this.logger.error('Failed to load picture pending changes', error);
                              return of([] as readonly PicturePending[]);
                          }),
                      )
                    : of([] as readonly PicturePending[]),
            ),
        ),
        { initialValue: [] as readonly PicturePending[] },
    );

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
    readonly canDelete = computed(() => {
        if (this._isDeleting() || this._isUploading() || this.articlesLoading()) return false;
        const articleList = this.articles();
        return articleList?.length === 0;
    });

    constructor() {
        effect(() => {
            this.picture(); // track picture changes
            this._titleOverride.set(undefined);
            this._imageOverride.set(undefined);
            this._isEditingTitle.set(false);
        });

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
        this.blurHandledByKeyboard = false;
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
                        this.refreshPending();
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
        if (!pic) return;

        this.logger.info('Opening lightbox from detail', { id: pic.id });

        const imageOverride = this._imageOverride();
        if (imageOverride) {
            this.lightboxService.openWithPicture({
                ...pic,
                title: this.displayTitle(),
                imageUrl: imageOverride,
            });
        } else {
            this.lightboxService.open(pic.id);
        }
    }

    editPicture(): void {
        if (this._isUploading()) return;
        this.fileInputRef()?.nativeElement.click();
    }

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        // Reset input so the same file can be re-selected
        input.value = '';

        if (!file) return;

        if (file.type !== ALLOWED_FILE_TYPE) {
            this.notificationService.error('Допустимый формат — только JPEG');
            return;
        }

        if (file.size > MAX_FILE_SIZE_BYTES) {
            this.notificationService.error('Максимальный размер файла — 500 КБ');
            return;
        }

        const previewUrl = URL.createObjectURL(file);

        this.modalService
            .open<ReplaceFileDialogData, ReplaceFileDialogResult>(
                () =>
                    import('../../components/replace-file-dialog/replace-file-dialog.component').then(
                        m => m.ReplaceFileDialogComponent,
                    ),
                {
                    data: { currentTitle: this.displayTitle(), previewUrl },
                    width: '500px',
                },
            )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(result => {
                if (result) {
                    this.uploadFile(file, result.title, previewUrl);
                } else {
                    URL.revokeObjectURL(previewUrl);
                }
            });
    }

    private uploadFile(file: File, title: string, previewUrl: string): void {
        const pic = this.picture();
        if (!pic) {
            URL.revokeObjectURL(previewUrl);
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('pic_title', title);

        this._isUploading.set(true);

        this.pictureService
            .editPicture(pic.id, formData)
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => {
                    this._isUploading.set(false);
                    URL.revokeObjectURL(previewUrl);
                }),
            )
            .subscribe({
                next: result => {
                    if (result.picture) {
                        this._titleOverride.set(result.picture.title);
                        this._imageOverride.set(result.picture.imageUrl);
                        this.notificationService.success('Файл заменён');
                    } else if (result.pending) {
                        this.refreshPending();
                        this.notificationService.info('Изменение отправлено на модерацию');
                    }
                    this.logger.info('File replacement submitted', { id: pic.id });
                },
                error: (err: unknown) => {
                    this.logger.error('Failed to replace file', err);
                    this.notificationService.error('Не удалось заменить файл');
                },
            });
    }

    deletePicture(): void {
        const pic = this.picture();
        if (!pic || !this.canDelete()) return;

        this.confirmationService
            .open({
                title: 'Удаление иллюстрации',
                message: 'Вы уверены, что хотите удалить эту иллюстрацию?',
                buttons: [
                    { key: 'cancel', label: 'Отмена' },
                    { key: 'confirm', label: 'Удалить', accent: 'danger' },
                ],
                disableClose: true,
            })
            .pipe(
                filter(result => result === 'confirm'),
                tap(() => this._isDeleting.set(true)),
                switchMap(() =>
                    this.pictureService.deletePicture(pic.id).pipe(finalize(() => this._isDeleting.set(false))),
                ),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe({
                next: editResult => {
                    if (editResult.picture) {
                        this.notificationService.success('Иллюстрация удалена');
                        this.router.navigate(['/pictures']);
                    } else if (editResult.pending) {
                        this.refreshPending();
                        this.notificationService.info('Запрос на удаление отправлен на модерацию');
                    }
                    this.logger.info('Delete submitted', { id: pic.id });
                },
                error: (err: unknown) => {
                    if (err instanceof HttpErrorResponse && err.status === 409) {
                        this.notificationService.error('Иллюстрация используется в статьях и не может быть удалена');
                    } else {
                        this.notificationService.error('Не удалось удалить иллюстрацию');
                    }
                    this.logger.error('Failed to delete picture', err);
                },
            });
    }

    openPendingImage(pending: PicturePending): void {
        const picture = this.picture();
        if (!picture || !pending.pendingImageUrl) return;

        const lightboxPicture: Picture = {
            ...picture,
            id: pending.pictureId,
            title: pending.title ?? pending.currentTitle,
            user: pending.user,
            date: pending.date,
            width: pending.width ?? pending.currentWidth,
            height: pending.height ?? pending.currentHeight,
            imageUrl: pending.pendingImageUrl,
            thumbnailUrl: pending.pendingImageUrl,
        };

        this.lightboxService.openWithPicture(lightboxPicture);
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

    private applyApprovedPending(pending: PicturePending): void {
        if (pending.pendingType === 'delete') {
            this.notificationService.success('Иллюстрация удалена');
            this.router.navigate(['/pictures']);
            return;
        }
        if (pending.pendingType === 'edit_title' || pending.pendingType === 'edit_both') {
            if (pending.title !== undefined) {
                this._titleOverride.set(pending.title);
            }
        }
        if (pending.pendingType === 'edit_file' || pending.pendingType === 'edit_both') {
            if (pending.pendingImageUrl) {
                this._imageOverride.set(pending.pendingImageUrl);
            }
        }
    }

    private refreshPending(): void {
        this._refreshPendingSubject.next();
    }

    runPendingAction(pending: PicturePending, pendingAction: PendingAction): void {
        if (this._pendingActionInProgress() === pending.id) return;

        let request$: Observable<void>;
        let successMessage: string;
        let errorMessage: string;
        let logMessage: string;

        switch (pendingAction) {
            case 'cancel':
                request$ = this.pictureService.cancelPending(pending.id);
                successMessage = 'Изменение отменено';
                errorMessage = 'Не удалось отменить изменение';
                logMessage = 'Pending cancellation submitted';
                break;
            case 'approve':
                request$ = this.pictureService.approvePending(pending.id);
                successMessage = 'Изменение одобрено';
                errorMessage = 'Не удалось одобрить изменение';
                logMessage = 'Pending approval submitted';
                break;
            case 'reject':
                request$ = this.pictureService.rejectPending(pending.id);
                successMessage = 'Изменение отклонено';
                errorMessage = 'Не удалось отклонить изменение';
                logMessage = 'Pending rejection submitted';
                break;
        }

        this._pendingActionInProgress.set(pending.id);
        request$
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this._pendingActionInProgress.set(undefined)),
            )
            .subscribe({
                next: () => {
                    if (pendingAction === 'approve') {
                        this.applyApprovedPending(pending);
                    }
                    this.refreshPending();
                    this.notificationService.success(successMessage);
                    this.logger.info(logMessage, { pendingId: pending.id, pictureId: pending.pictureId });
                },
                error: (error: unknown) => {
                    this.notificationService.error(errorMessage);
                    this.logger.error(logMessage, error);
                },
            });
    }
}
