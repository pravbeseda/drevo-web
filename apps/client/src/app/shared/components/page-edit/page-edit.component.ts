import { ArticleService } from '../../../services/articles';
import { AuthService } from '../../../services/auth/auth.service';
import { InworkService } from '../../../services/inwork';
import { LinksService } from '../../../services/links/links.service';
import { NewsService } from '../../../services/news/news.service';
import { PictureLightboxService } from '../../../services/pictures/picture-lightbox.service';
import { PictureService } from '../../../services/pictures/picture.service';
import { pageUrl } from '../../helpers/page-kind';
import { createPicturePreviewExtension } from '../../helpers/picture-tooltip';
import { NewsFields } from '../../models/news-fields.model';
import { PageEditSession } from '../../models/page-edit-session';
import { DraftEditorService } from '../../services/draft-editor/draft-editor.service';
import { DiffViewComponent } from '../diff-view/diff-view.component';
import { ErrorComponent } from '../error/error.component';
import { NewsFieldsComponent } from '../news-fields/news-fields.component';
import { NewsTopicSidebarActionComponent } from '../news-topic-sidebar-action/news-topic-sidebar-action.component';
import { PagePreviewComponent } from '../page-preview/page-preview.component';
import { SidebarActionComponent } from '../sidebar-action/sidebar-action.component';
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
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Extension } from '@codemirror/state';
import { LoggerService, NotificationService, readApiErrorBody } from '@drevo-web/core';
import { CustomToolbarAction, EditorComponent, validateWikiContent, ValidationResult } from '@drevo-web/editor';
import {
    NewsMetaChange,
    NewsTopic,
    PageKind,
    SaveArticleVersionResult,
    formatDateHeader,
    formatTime,
    toCalendarDateString,
} from '@drevo-web/shared';
import { ConfirmationService } from '@drevo-web/ui/confirmation';
import { IconComponent } from '@drevo-web/ui/icon';
import { ModalService } from '@drevo-web/ui/modal';
import { TooltipDirective } from '@drevo-web/ui/tooltip';
import { WorkspaceComponent, WorkspaceTabComponent } from '@drevo-web/ui/workspace';
import { Observable, first, firstValueFrom, filter, map, of, switchMap, tap } from 'rxjs';

const EDITOR_TAB_INDEX = 0;

/** How the editor names a page of each kind to the reader. */
const LABELS: Readonly<
    Record<PageKind, { readonly saved: string; readonly created: string; readonly of: string; readonly noText: string }>
> = {
    articles: { saved: 'Статья сохранена', created: 'Статья создана', of: 'статьи', noText: 'Введите текст статьи' },
    news: { saved: 'Новость сохранена', created: 'Новость создана', of: 'новости', noText: 'Введите текст новости' },
};

const NEW_NEWS_INFO = 'Новая новость';

/** The wiki editor of an article or a news item: an existing version, or a page not created yet. */
@Component({
    selector: 'app-page-edit',
    imports: [
        DiffViewComponent,
        EditorComponent,
        ErrorComponent,
        NewsFieldsComponent,
        NewsTopicSidebarActionComponent,
        IconComponent,
        PagePreviewComponent,
        SidebarActionComponent,
        TooltipDirective,
        WorkspaceComponent,
        WorkspaceTabComponent,
    ],
    templateUrl: './page-edit.component.html',
    styleUrl: './page-edit.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageEditComponent implements OnInit, OnDestroy {
    @ViewChild(EditorComponent) private readonly editorComponent?: EditorComponent;

    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly articleService = inject(ArticleService);
    private readonly newsService = inject(NewsService);
    private readonly notificationService = inject(NotificationService);
    private readonly linksService = inject(LinksService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly draftEditorService = inject(DraftEditorService);
    private readonly inworkService = inject(InworkService);
    private readonly confirmationService = inject(ConfirmationService);
    private readonly logger = inject(LoggerService).withContext('PageEditComponent');
    private readonly pictureService = inject(PictureService);
    private readonly pictureLightboxService = inject(PictureLightboxService);
    private readonly modalService = inject(ModalService);

    private readonly _editorContent = signal<string>('');
    private readonly _isSaving = signal(false);
    private readonly _error = signal<string | undefined>(undefined);
    private readonly _updateLinksState = signal<Record<string, boolean>>({});
    private readonly _originalContent = signal('');
    private readonly _articleId = signal(0);
    private readonly _kind = signal<PageKind>('articles');
    private readonly _newsTopics = signal<readonly NewsTopic[]>([]);
    private readonly user = toSignal(inject(AuthService).user$);

    /** What the news fields held when the session opened, or when the meta was last saved. */
    private initialNewsFields: NewsFields = {
        title: '',
        newsDate: toCalendarDateString(new Date()),
        topic: undefined,
    };
    private readonly _newsFields = signal<NewsFields>(this.initialNewsFields);
    private readonly _isNewsCreate = signal(false);
    private readonly _isNewsEdit = signal(false);

    private readonly picturePreviewExtension: Extension = createPicturePreviewExtension({
        getPicturesBatch: (ids: readonly number[]) => this.pictureService.getPicturesBatch(ids),
        onPictureClick: (id: number) => this.pictureLightboxService.open(id),
    });

    private readonly _validationResult = signal<ValidationResult>({ errors: 0, warnings: 0 });

    private session: PageEditSession | undefined;
    private editingCleared = false;

    readonly editorContent = this._editorContent.asReadonly();
    readonly isSaving = this._isSaving.asReadonly();
    readonly error = this._error.asReadonly();
    readonly updateLinksState = this._updateLinksState.asReadonly();
    readonly originalContent = this._originalContent.asReadonly();
    readonly articleId = this._articleId.asReadonly();
    readonly kind = this._kind.asReadonly();
    readonly newsTopics = this._newsTopics.asReadonly();
    readonly newsFields = this._newsFields.asReadonly();
    /** A news item being created asks for its title, day and section beside its text. */
    readonly isNewsCreate = this._isNewsCreate.asReadonly();
    /**
     * The title and the day are asked for on a news item being created, and
     * shown to a moderator editing one — only a moderator may change them.
     */
    readonly showNewsFields = computed(
        () => this._isNewsCreate() || (this._isNewsEdit() && (this.user()?.permissions.canModerate ?? false)),
    );
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
        const session = this.route.snapshot.data['session'] as PageEditSession | undefined;
        if (!session) {
            this._error.set('Версия не найдена');
            this.logger.error('Edit session not resolved from route data');
            return;
        }

        this.session = session;
        this._kind.set(session.kind);
        this._isNewsCreate.set(session.kind === 'news' && session.mode === 'create');
        this._isNewsEdit.set(session.kind === 'news' && session.mode === 'edit');
        if (this._isNewsEdit()) {
            this.initialNewsFields = { title: session.title, newsDate: session.newsDate ?? '', topic: undefined };
            this._newsFields.set(this.initialNewsFields);
        }
        this._newsTopics.set(session.newsTopics ?? []);
        this._articleId.set(session.articleId);
        this._originalContent.set(session.content);
        this._editorContent.set(session.content);
        this.logger.info('Edit session started', {
            kind: session.kind,
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
                title: this.draftTitle(),
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
            const missing = this.missingNewsField() ?? (content.trim() ? undefined : LABELS[session.kind].noText);
            if (missing) {
                this.notificationService.info(missing);
                return;
            }
        } else {
            const missing = this.missingNewsField();
            if (missing) {
                this.notificationService.info(missing);
                return;
            }
            if (content === session.content && Object.keys(this.newsMetaChange()).length === 0) {
                this.notificationService.info('Нет изменений для сохранения');
                return;
            }
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
        this.logger.info('Saving page', {
            kind: session.kind,
            mode: session.mode,
            versionId: session.versionId,
            articleId: session.articleId,
            contentLength: content.length,
        });

        const save$ = session.mode === 'edit' ? this.editPage(session, content) : this.createPage(session, content);

        save$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: result => {
                this._isSaving.set(false);
                this.logger.info('Page saved', { articleId: result.articleId });
                const labels = LABELS[session.kind];
                this.notificationService.success(session.mode === 'create' ? labels.created : labels.saved);
                void this.draftEditorService.discardDraft(this.getDraftRoute());
                this.clearEditingMark();
                void this.router.navigateByUrl(pageUrl(session.kind, result.articleId));
            },
            error: (err: HttpErrorResponse) => {
                this._isSaving.set(false);
                this.logger.error('Failed to save page', err);

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

        try {
            // The draft is written 3 s after typing stops, so fresh edits may not be stored yet.
            const hasUnsavedChanges =
                this._editorContent() !== session.content ||
                this._newsFields() !== this.initialNewsFields ||
                (await this.draftEditorService.getDraft(draftRoute)) !== undefined;

            if (!hasUnsavedChanges) {
                // Discard pending input so ngOnDestroy.flush() won't persist it
                await this.draftEditorService.discardDraft(draftRoute);
                this.clearEditingMark();
                this.leave(session);
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
                this.leave(session);
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
                    import('../../../features/picture/pages/picture-page/picture-page.component').then(
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

    onNewsFields(fields: NewsFields): void {
        this._newsFields.set(fields);
    }

    onNewsTopic(topic: number): void {
        this._newsFields.update(fields => ({ ...fields, topic }));
    }

    /** What a news item being created still lacks besides its text; nothing for any other session. */
    private missingNewsField(): string | undefined {
        if (!this.showNewsFields()) {
            return undefined;
        }
        const { title, newsDate, topic } = this._newsFields();
        if (!title.trim()) return 'Введите заголовок новости';
        // A news item is created with a day; an undated one being edited may stay so, but a day is not cleared.
        if (!newsDate && (this._isNewsCreate() || this.initialNewsFields.newsDate)) return 'Укажите дату новости';
        if (this._isNewsCreate() && topic === undefined) return 'Выберите раздел новости';
        return undefined;
    }

    /** The title and the day a moderator changed on a news item being edited. */
    private newsMetaChange(): NewsMetaChange {
        if (!this._isNewsEdit() || !this.showNewsFields()) {
            return {};
        }
        const { title, newsDate } = this._newsFields();
        const before = this.initialNewsFields;
        return {
            ...(title.trim() === before.title ? {} : { title: title.trim() }),
            ...(newsDate === before.newsDate ? {} : { newsDate }),
        };
    }

    /**
     * The meta first — the cheaper of the two, refused before any text is
     * stored — then the text, each only when it changed. A saved meta becomes
     * the baseline, so a retry after a failed text save does not send it again.
     */
    private editPage(
        session: PageEditSession,
        content: string,
    ): Observable<Pick<SaveArticleVersionResult, 'articleId'>> {
        const meta = this.newsMetaChange();
        const meta$: Observable<unknown> =
            Object.keys(meta).length === 0
                ? of(undefined)
                : this.newsService.updateMeta(session.articleId, meta).pipe(
                      tap(() => {
                          this.initialNewsFields = this._newsFields();
                      }),
                  );
        const text$ =
            content === session.content
                ? of({ articleId: session.articleId })
                : this.articleService.saveArticleVersion({ versionId: session.versionId, content }, session.kind);
        return meta$.pipe(switchMap(() => text$));
    }

    private createPage(session: PageEditSession, content: string): Observable<SaveArticleVersionResult> {
        if (session.kind === 'articles') {
            return this.articleService.createArticle({ title: session.title, content, info: 'Новая статья' });
        }
        const { title, newsDate, topic } = this._newsFields();
        // missingNewsField() let the save through, so the section is picked.
        return this.newsService.createNews({
            title: title.trim(),
            newsDate,
            topic: topic ?? 0,
            content,
            info: NEW_NEWS_INFO,
        });
    }

    /** A news item being created is named by the title typed so far. */
    private draftTitle(): string {
        return this._isNewsCreate() ? this._newsFields().title || NEW_NEWS_INFO : (this.session?.title ?? '');
    }

    private getDraftRoute(): string {
        return this.session?.draftKey ?? '';
    }

    /** Back to what was being edited, or to where the new page was asked for — the session's resolver knows which. */
    private leave(session: PageEditSession): void {
        void this.router.navigateByUrl(session.exitUrl);
    }

    private async showRestoreDraftDialog(title: string, time: number, text: string, draftRoute: string): Promise<void> {
        const savedAt = this.formatSavedAt(time);
        const result = await firstValueFrom(
            this.confirmationService.open({
                title: 'Найден черновик',
                message: `Черновик ${LABELS[this._kind()].of} «${title}» сохранён ${savedAt}. Восстановить?`,
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

    private checkInworkAndMark(session: PageEditSession): void {
        // The backend keeps editing marks for articles only.
        if (session.kind !== 'articles') {
            return;
        }
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

    private confirmInworkEditing(editor: string, session: PageEditSession): Observable<boolean> {
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
                    void this.router.navigateByUrl(
                        session.mode === 'create' ? session.exitUrl : pageUrl(session.kind, session.articleId),
                    );
                    return false;
                }),
            );
    }

    private clearEditingMark(): void {
        if (this.editingCleared || this.session?.kind !== 'articles') {
            return;
        }
        this.editingCleared = true;
        this.inworkService.clearEditing(this.session.title).subscribe();
    }
}
