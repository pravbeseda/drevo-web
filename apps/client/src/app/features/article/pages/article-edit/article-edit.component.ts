import { ArticleService } from '../../../../services/articles';
import { InworkService } from '../../../../services/inwork';
import { LinksService } from '../../../../services/links/links.service';
import { PictureLightboxService } from '../../../../services/pictures/picture-lightbox.service';
import { PictureService } from '../../../../services/pictures/picture.service';
import { DiffViewComponent } from '../../../../shared/components/diff-view/diff-view.component';
import { ErrorComponent } from '../../../../shared/components/error/error.component';
import { SidebarActionComponent } from '../../../../shared/components/sidebar-action/sidebar-action.component';
import { createPicturePreviewExtension } from '../../../../shared/helpers/picture-tooltip';
import { DraftEditorService } from '../../../../shared/services/draft-editor/draft-editor.service';
import { PreviewComponent } from '../../components/preview/preview.component';
import { ArticleEditSession, toEditSession } from '../../models/article-edit-session';
import { HttpErrorResponse } from '@angular/common/http';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    inject,
    OnDestroy,
    OnInit,
    signal,
    ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Extension } from '@codemirror/state';
import { LoggerService, NotificationService, readApiErrorBody } from '@drevo-web/core';
import { CustomToolbarAction, EditorComponent, validateWikiContent, ValidationResult } from '@drevo-web/editor';
import { ArticleVersion, formatDateHeader, formatTime } from '@drevo-web/shared';
import {
    ConfirmationService,
    IconComponent,
    ModalService,
    TooltipDirective,
    WorkspaceComponent,
    WorkspaceTabComponent,
} from '@drevo-web/ui';
import { Observable, first, firstValueFrom, filter, map, of, switchMap } from 'rxjs';

const EDITOR_TAB_INDEX = 0;

@Component({
    selector: 'app-article-edit',
    imports: [
        DiffViewComponent,
        EditorComponent,
        ErrorComponent,
        IconComponent,
        PreviewComponent,
        SidebarActionComponent,
        TooltipDirective,
        WorkspaceComponent,
        WorkspaceTabComponent,
    ],
    templateUrl: './article-edit.component.html',
    styleUrl: './article-edit.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleEditComponent implements OnInit, OnDestroy {
    @ViewChild(EditorComponent) private readonly editorComponent?: EditorComponent;

    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly articleService = inject(ArticleService);
    private readonly notificationService = inject(NotificationService);
    private readonly linksService = inject(LinksService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly draftEditorService = inject(DraftEditorService);
    private readonly inworkService = inject(InworkService);
    private readonly confirmationService = inject(ConfirmationService);
    private readonly logger = inject(LoggerService).withContext('ArticleEditComponent');
    private readonly pictureService = inject(PictureService);
    private readonly pictureLightboxService = inject(PictureLightboxService);
    private readonly modalService = inject(ModalService);

    private readonly _editorContent = signal<string>('');
    private readonly _isSaving = signal(false);
    private readonly _error = signal<string | undefined>(undefined);
    private readonly _updateLinksState = signal<Record<string, boolean>>({});
    private readonly _originalContent = signal('');
    private readonly _articleId = signal(0);

    private readonly picturePreviewExtension: Extension = createPicturePreviewExtension({
        getPicturesBatch: (ids: readonly number[]) => this.pictureService.getPicturesBatch(ids),
        onPictureClick: (id: number) => this.pictureLightboxService.open(id),
    });

    private readonly _validationResult = signal<ValidationResult>({ errors: 0, warnings: 0 });

    private session: ArticleEditSession | undefined;
    private editingCleared = false;

    readonly editorContent = this._editorContent.asReadonly();
    readonly isSaving = this._isSaving.asReadonly();
    readonly error = this._error.asReadonly();
    readonly updateLinksState = this._updateLinksState.asReadonly();
    readonly originalContent = this._originalContent.asReadonly();
    readonly articleId = this._articleId.asReadonly();
    readonly validationResult = this._validationResult.asReadonly();
    readonly hasErrors = computed(() => this._validationResult().errors > 0);
    readonly hasWarnings = computed(() => this._validationResult().warnings > 0);
    readonly hasProblems = computed(() => this.hasErrors() || this.hasWarnings());
    readonly validationTooltip = computed(() => {
        const { errors, warnings } = this._validationResult();
        if (errors === 0 && warnings === 0) return 'Проблем нет';
        const parts: string[] = [];
        if (errors > 0) parts.push(`Ошибок: ${errors}`);
        if (warnings > 0) parts.push(`Предупреждений: ${warnings}`);
        return parts.join('. ');
    });
    readonly editorExtensions: Extension[] = [this.picturePreviewExtension];
    readonly customToolbarActions: CustomToolbarAction[] = [
        {
            icon: 'add_photo_alternate',
            tooltip: 'Вставить иллюстрацию',
            callback: () => this.openPicturePicker(),
        },
    ];

    ngOnInit(): void {
        const session = this.readSession();
        if (!session) {
            this._error.set('Версия не найдена');
            this.logger.error('Edit session not resolved from route data');
            return;
        }

        this.session = session;
        this._articleId.set(session.articleId);
        this._originalContent.set(session.content);
        this._editorContent.set(session.content);
        this.logger.info('Edit session started', {
            mode: session.mode,
            versionId: session.versionId,
            articleId: session.articleId,
            title: session.title,
        });

        this.checkInworkAndMark(session);

        const draftRoute = this.getDraftRoute();
        const isReentry = this.draftEditorService.hasActiveSession(draftRoute);

        this.draftEditorService
            .getDraft(draftRoute)
            .then(draft => {
                if (!draft) {
                    return;
                }

                if (isReentry) {
                    this._editorContent.set(draft.text);
                    this.logger.info('Draft silently restored (re-entry)', { route: draftRoute });
                    return;
                }

                // Returned, not fired and forgotten: the dialog's rejection then lands in
                // the catch below instead of going unhandled.
                return this.showRestoreDraftDialog(draft.title, draft.time, draft.text, draftRoute);
            })
            .catch((err: unknown) => {
                this.logger.error('Failed to check draft', err);
            });
    }

    /**
     * The create route resolves a session directly; the existing edit route
     * still resolves an `ArticleVersion` under `version` and is adapted here,
     * so that route, its titleSource and its specs stay untouched.
     */
    private readSession(): ArticleEditSession | undefined {
        const data = this.route.snapshot.data;
        const session = data['session'] as ArticleEditSession | undefined;
        if (session) {
            return session;
        }

        const version = data['version'] as ArticleVersion | undefined;
        return version ? toEditSession(version) : undefined;
    }

    ngOnDestroy(): void {
        this.clearEditingMark();
        this.draftEditorService.flush();
    }

    updateLinks(links: string[]): void {
        this.linksService
            .getLinkStatuses(links)
            .pipe(first(), takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: linksState => {
                    this._updateLinksState.set(linksState);
                },
                error: (err: unknown) => {
                    this.logger.error('Failed to check link statuses', err);
                },
            });
    }

    onValidationChange(result: ValidationResult): void {
        this._validationResult.set(result);
    }

    contentChanged(content: string): void {
        this._editorContent.set(content);
        this.logger.debug('Content changed', { length: content.length });

        if (this.session) {
            this.draftEditorService.onContentChanged({
                route: this.getDraftRoute(),
                title: this.session.title,
                text: content,
            });
        }
    }

    save(): void {
        const session = this.session;
        if (!session || this.isSaving()) {
            return;
        }

        const content = this._editorContent();

        if (session.mode === 'create') {
            if (!content.trim()) {
                this.notificationService.info('Введите текст статьи');
                return;
            }
        } else if (content === session.content) {
            this.notificationService.info('Нет изменений для сохранения');
            return;
        }

        const problems = validateWikiContent(content);
        const errors = problems.filter(p => p.severity === 'error');
        const warnings = problems.filter(p => p.severity === 'warning');

        if (errors.length > 0) {
            this.notificationService.error(
                `В тексте найдены ошибки (${errors.length}). Исправьте их перед сохранением`,
            );
            return;
        }

        if (warnings.length > 0) {
            this.confirmAndSave(content, warnings.length);
            return;
        }

        this.performSave(content);
    }

    private confirmAndSave(content: string, warningCount: number): void {
        this.confirmationService
            .open({
                title: 'Предупреждения в тексте',
                message: `В тексте найдены предупреждения (${warningCount}). Сохранить?`,
                buttons: [
                    { key: 'cancel', label: 'Отмена' },
                    { key: 'confirm', label: 'Сохранить', accent: 'primary' },
                ],
            })
            .pipe(
                filter(result => result === 'confirm'),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe(() => this.performSave(content));
    }

    private performSave(content: string): void {
        const session = this.session;
        if (!session) return;

        this._isSaving.set(true);
        this.logger.info('Saving article', {
            mode: session.mode,
            versionId: session.versionId,
            articleId: session.articleId,
            contentLength: content.length,
        });

        const save$ =
            session.mode === 'create'
                ? this.articleService.createArticle({ title: session.title, content, info: 'Новая статья' })
                : this.articleService.saveArticleVersion({ versionId: session.versionId, content });

        save$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: result => {
                this._isSaving.set(false);
                this.logger.info('Article saved', {
                    newVersionId: result.versionId,
                    articleId: result.articleId,
                });
                this.notificationService.success(session.mode === 'create' ? 'Статья создана' : 'Статья сохранена');
                void this.draftEditorService.discardDraft(this.getDraftRoute());
                this.clearEditingMark();
                void this.router.navigate(['/articles', result.articleId]);
            },
            error: (err: HttpErrorResponse) => {
                this._isSaving.set(false);
                this.logger.error('Failed to save article', err);

                if (this.handleDuplicateTitle(err)) {
                    return;
                }

                const backendMessage = readApiErrorBody(err)?.error;
                let errorMessage = 'Ошибка сохранения';
                if (err.status === 401) {
                    errorMessage = 'Необходима авторизация';
                } else if (err.status === 403) {
                    errorMessage = backendMessage || 'Нет прав для сохранения';
                } else if (backendMessage) {
                    errorMessage = backendMessage;
                }

                this.notificationService.error(errorMessage);
            },
        });
    }

    /**
     * A 409 from /create means the title was created concurrently while the user
     * was typing. Keep them in the editor with their content and the draft intact
     * so they can copy it out — navigating away (and discarding the draft) would
     * silently destroy potentially substantial input for an article they didn't
     * write. Only meaningful in create mode: a version save has no title to
     * duplicate, so its 409 falls through to the normal error branch.
     */
    private handleDuplicateTitle(err: HttpErrorResponse): boolean {
        if (this.session?.mode !== 'create') {
            return false;
        }
        if (err.status !== 409 || readApiErrorBody(err)?.errorCode !== 'DUPLICATE_TITLE') {
            return false;
        }

        this.notificationService.error(
            'Статья с таким названием уже создана. Ваш текст не сохранён — скопируйте его при необходимости.',
        );
        return true;
    }

    toggleLintPanel(): void {
        this.editorComponent?.toggleLintPanel();
    }

    onTabChange(index: number): void {
        if (index === EDITOR_TAB_INDEX) {
            requestAnimationFrame(() => this.editorComponent?.requestMeasure());
        }
    }

    async cancel(): Promise<void> {
        const session = this.session;
        if (!session) {
            void this.router.navigate(['/']);
            return;
        }

        const draftRoute = this.getDraftRoute();
        const navigateTo =
            session.mode === 'create'
                ? ['/articles', 'find', session.title]
                : ['/articles', session.articleId, 'version', session.versionId];

        try {
            const draft = await this.draftEditorService.getDraft(draftRoute);

            if (!draft) {
                // Discard pending input so ngOnDestroy.flush() won't persist it
                await this.draftEditorService.discardDraft(draftRoute);
                this.clearEditingMark();
                void this.router.navigate(navigateTo);
                return;
            }

            const result = await firstValueFrom(
                this.confirmationService.open({
                    title: 'Удалить черновик?',
                    message: 'Вы уверены, что хотите удалить черновик? Несохранённые изменения будут потеряны.',
                    buttons: [
                        { key: 'cancel', label: 'Остаться' },
                        { key: 'confirm', label: 'Удалить', accent: 'danger' },
                    ],
                    disableClose: true,
                }),
            );

            if (result === 'confirm') {
                await this.draftEditorService.discardDraft(draftRoute);
                this.clearEditingMark();
                void this.router.navigate(navigateTo);
            }
        } catch (error) {
            this.logger.error('Failed to confirm discard', error);
        }
    }

    private openPicturePicker(): void {
        this.logger.info('Opening picture picker');

        this.modalService
            .open<undefined, string>(
                () =>
                    import('../../../../features/picture/pages/picture-page/picture-page.component').then(
                        m => m.PicturePageComponent,
                    ),
                {
                    width: '90vw',
                    height: '90vh',
                },
            )
            .pipe(
                filter((result): result is string => !!result),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe(code => {
                this.logger.info('Picture selected', { code });
                this.editorComponent?.insertText({ tagOpen: code, tagClose: '', sampleText: '' });
            });
    }

    private getDraftRoute(): string {
        const session = this.session;
        if (!session) {
            return '';
        }
        return session.mode === 'create'
            ? `/articles/find/${session.title}/edit`
            : `/articles/${session.articleId}/version/${session.versionId}/edit`;
    }

    private async showRestoreDraftDialog(title: string, time: number, text: string, draftRoute: string): Promise<void> {
        const savedAt = this.formatSavedAt(time);
        const result = await firstValueFrom(
            this.confirmationService.open({
                title: 'Найден черновик',
                message: `Черновик статьи «${title}» сохранён ${savedAt}. Восстановить?`,
                buttons: [
                    { key: 'discard', label: 'Удалить черновик' },
                    { key: 'restore', label: 'Восстановить', accent: 'primary' },
                ],
                disableClose: true,
            }),
        );

        if (result === 'restore') {
            this._editorContent.set(text);
            this.logger.info('Draft restored', { route: draftRoute });
        } else {
            this.logger.info('Draft declined, deleting', { route: draftRoute });
            await this.draftEditorService.discardDraft(draftRoute);
        }
    }

    private formatSavedAt(epochMs: number): string {
        const date = new Date(epochMs);
        const dateStr = formatDateHeader(date);
        const timeStr = formatTime(date);
        return `${dateStr}, ${timeStr}`;
    }

    private checkInworkAndMark(session: ArticleEditSession): void {
        // In create mode versionId is 0, and that is intentional: the inwork mark
        // is keyed by title (not versionId), the backend defaults versionId to 0,
        // and locking the title during creation is what warns a second author of a
        // concurrent create. It cannot go stale or collide — clearEditingMark()
        // removes it by title on success and on destroy, a backend TTL expires it,
        // and editing the real version later REPLACEs the row by title.
        this.inworkService
            .getActiveEditor(session.title)
            .pipe(
                switchMap(editor => (editor ? this.confirmInworkEditing(editor, session) : of(true))),
                filter(shouldMark => shouldMark),
                switchMap(() => this.inworkService.markEditing(session.title, session.versionId)),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe();
    }

    private confirmInworkEditing(editor: string, session: ArticleEditSession): Observable<boolean> {
        return this.confirmationService
            .open({
                title: 'Статья редактируется',
                message:
                    `Эту статью сейчас редактирует участник «${editor}», одновременная работа может привести к конфликту версий. ` +
                    'Рекомендуем Вам повременить с правкой этой статьи. Вы настаиваете на редактировании?',
                buttons: [
                    { key: 'back', label: 'Назад' },
                    { key: 'continue', label: 'Редактировать', accent: 'primary' },
                ],
                disableClose: true,
            })
            .pipe(
                map(result => {
                    if (result === 'continue') {
                        return true;
                    }
                    this.editingCleared = true;
                    void this.router.navigate(
                        session.mode === 'create'
                            ? ['/articles', 'find', session.title]
                            : ['/articles', session.articleId],
                    );
                    return false;
                }),
            );
    }

    private clearEditingMark(): void {
        if (this.editingCleared || !this.session) {
            return;
        }
        this.editingCleared = true;
        this.inworkService.clearEditing(this.session.title).subscribe();
    }
}
