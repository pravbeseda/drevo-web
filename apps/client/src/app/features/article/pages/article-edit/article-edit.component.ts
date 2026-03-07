import { ArticleService } from '../../../../services/articles';
import { InworkService } from '../../../../services/inwork/inwork.service';
import { LinksService } from '../../../../services/links/links.service';
import { DiffViewComponent } from '../../../../shared/components/diff-view/diff-view.component';
import { ErrorComponent } from '../../../../shared/components/error/error.component';
import { SidebarActionComponent } from '../../../../shared/components/sidebar-action/sidebar-action.component';
import { DraftEditorService } from '../../../../shared/services/draft-editor/draft-editor.service';
import { PreviewComponent } from '../../components/preview/preview.component';
import { HttpErrorResponse } from '@angular/common/http';
import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    inject,
    OnDestroy,
    OnInit,
    signal,
    ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { LoggerService, NotificationService } from '@drevo-web/core';
import { EditorComponent } from '@drevo-web/editor';
import { ArticleVersion, formatDateHeader, formatTime } from '@drevo-web/shared';
import { ConfirmationService, WorkspaceComponent, WorkspaceTabComponent } from '@drevo-web/ui';
import { Observable, first, firstValueFrom, filter, map, of, switchMap } from 'rxjs';

const EDITOR_TAB_INDEX = 0;

@Component({
    selector: 'app-article-edit',
    imports: [
        DiffViewComponent,
        EditorComponent,
        ErrorComponent,
        PreviewComponent,
        SidebarActionComponent,
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

    private readonly _editorContent = signal<string>('');
    private readonly _isSaving = signal(false);
    private readonly _error = signal<string | undefined>(undefined);
    private readonly _updateLinksState = signal<Record<string, boolean>>({});
    private readonly _originalContent = signal('');
    private readonly _articleId = signal(0);

    private version: ArticleVersion | undefined;
    private editingCleared = false;

    readonly editorContent = this._editorContent.asReadonly();
    readonly isSaving = this._isSaving.asReadonly();
    readonly error = this._error.asReadonly();
    readonly updateLinksState = this._updateLinksState.asReadonly();
    readonly originalContent = this._originalContent.asReadonly();
    readonly articleId = this._articleId.asReadonly();

    ngOnInit(): void {
        const version = this.route.snapshot.data['version'] as ArticleVersion | undefined;
        if (!version) {
            this._error.set('Версия не найдена');
            this.logger.error('Version not resolved from route data');
            return;
        }

        this.version = version;
        this._articleId.set(version.articleId);
        this._originalContent.set(version.content);
        this._editorContent.set(version.content);
        this.logger.info('Version loaded for editing', {
            versionId: version.versionId,
            articleId: version.articleId,
            title: version.title,
        });

        this.checkInworkAndMark(version);

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
                } else {
                    this.showRestoreDraftDialog(draft.title, draft.time, draft.text, draftRoute);
                }
            })
            .catch(err => {
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
                error: err => {
                    this.logger.error('Failed to check link statuses', err);
                },
            });
    }

    contentChanged(content: string): void {
        this._editorContent.set(content);
        this.logger.debug('Content changed', { length: content.length });

        if (this.version) {
            this.draftEditorService.onContentChanged({
                route: this.getDraftRoute(),
                title: this.version.title,
                text: content,
            });
        }
    }

    save(): void {
        if (!this.version || this.isSaving()) {
            return;
        }

        const content = this._editorContent();

        if (content === this.version.content) {
            this.notificationService.info('Нет изменений для сохранения');
            return;
        }

        this._isSaving.set(true);
        this.logger.info('Saving article', {
            versionId: this.version.versionId,
            articleId: this.version.articleId,
            contentLength: content.length,
        });

        this.articleService
            .saveArticleVersion({
                versionId: this.version.versionId,
                content,
            })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: result => {
                    this._isSaving.set(false);
                    this.logger.info('Article saved', {
                        newVersionId: result.versionId,
                        articleId: result.articleId,
                    });
                    this.notificationService.success('Статья сохранена');
                    this.draftEditorService.discardDraft(this.getDraftRoute());
                    this.clearEditingMark();
                    this.router.navigate(['/articles', result.articleId]);
                },
                error: (err: HttpErrorResponse) => {
                    this._isSaving.set(false);
                    this.logger.error('Failed to save article', err);

                    let errorMessage = 'Ошибка сохранения';
                    if (err.status === 401) {
                        errorMessage = 'Необходима авторизация';
                    } else if (err.status === 403) {
                        errorMessage = err.error?.error || 'Нет прав для сохранения';
                    } else if (err.error?.error) {
                        errorMessage = err.error.error;
                    }

                    this.notificationService.error(errorMessage);
                },
            });
    }

    onTabChange(index: number): void {
        if (index === EDITOR_TAB_INDEX) {
            requestAnimationFrame(() => this.editorComponent?.requestMeasure());
        }
    }

    async cancel(): Promise<void> {
        if (!this.version) {
            this.router.navigate(['/']);
            return;
        }

        const draftRoute = this.getDraftRoute();
        const navigateTo = ['/articles', this.version.articleId, 'version', this.version.versionId];

        try {
            const draft = await this.draftEditorService.getDraft(draftRoute);

            if (!draft) {
                // Discard pending input so ngOnDestroy.flush() won't persist it
                await this.draftEditorService.discardDraft(draftRoute);
                this.clearEditingMark();
                this.router.navigate(navigateTo);
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
                this.router.navigate(navigateTo);
            }
        } catch (error) {
            this.logger.error('Failed to confirm discard', error);
        }
    }

    private getDraftRoute(): string {
        const v = this.version;
        return v ? `/articles/${v.articleId}/version/${v.versionId}/edit` : '';
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

    private checkInworkAndMark(version: ArticleVersion): void {
        this.inworkService
            .getActiveEditor(version.title)
            .pipe(
                switchMap(editor => (editor ? this.confirmInworkEditing(editor, version) : of(true))),
                filter(shouldMark => shouldMark),
                switchMap(() => this.inworkService.markEditing(version.title, version.versionId)),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe();
    }

    private confirmInworkEditing(editor: string, version: ArticleVersion): Observable<boolean> {
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
                    this.router.navigate(['/articles', version.articleId]);
                    return false;
                }),
            );
    }

    private clearEditingMark(): void {
        if (this.editingCleared || !this.version) {
            return;
        }
        this.editingCleared = true;
        this.inworkService.clearEditing(this.version.title).subscribe();
    }
}
