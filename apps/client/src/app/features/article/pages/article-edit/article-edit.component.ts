import { ArticleService } from '../../../../services/articles';
import { LinksService } from '../../../../services/links/links.service';
import { ErrorComponent } from '../../../../shared/components/error/error.component';
import { SidebarActionComponent } from '../../../../shared/components/sidebar-action/sidebar-action.component';
import { DraftEditorService } from '../../../../shared/services/draft-editor/draft-editor.service';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { LoggerService, NotificationService } from '@drevo-web/core';
import { EditorComponent } from '@drevo-web/editor';
import { ArticleVersion } from '@drevo-web/shared';
import { first } from 'rxjs';

@Component({
    selector: 'app-article-edit',
    imports: [EditorComponent, ErrorComponent, SidebarActionComponent],
    templateUrl: './article-edit.component.html',
    styleUrl: './article-edit.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleEditComponent {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly articleService = inject(ArticleService);
    private readonly notificationService = inject(NotificationService);
    private readonly linksService = inject(LinksService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly draftEditor = inject(DraftEditorService);
    private readonly logger = inject(LoggerService).withContext('ArticleEditComponent');

    private currentContent: string | undefined = undefined;

    private readonly _editorContent = signal<string>('');
    private readonly _isSaving = signal(false);
    private readonly _error = signal<string | undefined>(undefined);
    private readonly _updateLinksState = signal<Record<string, boolean>>({});

    readonly version = this.route.snapshot.data['version'] as ArticleVersion | undefined;
    readonly editorContent = this._editorContent.asReadonly();
    readonly isSaving = this._isSaving.asReadonly();
    readonly error = this._error.asReadonly();
    readonly updateLinksState = this._updateLinksState.asReadonly();

    constructor() {
        if (!this.version) {
            this._error.set('Версия не найдена');
            this.logger.error('Version not resolved from route data');
            return;
        }

        this._editorContent.set(this.version.content);
        this.logger.info('Version loaded for editing', {
            versionId: this.version.versionId,
            articleId: this.version.articleId,
            title: this.version.title,
        });

        const route = `/articles/edit/${this.version.articleId}`;
        this.draftEditor.checkDraft(route).then(draftText => {
            if (draftText !== undefined) {
                this._editorContent.set(draftText);
            }
        });
    }

    updateLinks(links: string[]): void {
        this.linksService
            .getLinkStatuses(links)
            .pipe(first())
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
        this.currentContent = content;
        this.logger.debug('Content changed', { length: content.length });

        if (this.version) {
            this.draftEditor.onContentChanged({
                route: `/articles/edit/${this.version.articleId}`,
                title: this.version.title,
                text: content,
            });
        }
    }

    save(): void {
        if (!this.version || this.isSaving()) {
            return;
        }

        const content = this.currentContent ?? this.version.content;

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
                    this.draftEditor.discardDraft(`/articles/edit/${result.articleId}`);
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

    cancel(): void {
        if (!this.version) {
            this.router.navigate(['/']);
            return;
        }

        const route = `/articles/edit/${this.version.articleId}`;
        this.draftEditor.confirmDiscardAndNavigate(route, ['/articles', this.version.articleId]);
    }
}
