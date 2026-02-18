import { ArticleService } from '../../../../services/articles';
import { LinksService } from '../../../../services/links/links.service';
import { ErrorComponent } from '../../../../shared/components/error/error.component';
import { AsyncPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { NotificationService, LoggerService } from '@drevo-web/core';
import { EditorComponent } from '@drevo-web/editor';
import { ArticleVersion } from '@drevo-web/shared';
import { SidebarActionDirective, SpinnerComponent } from '@drevo-web/ui';
import { BehaviorSubject, first } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

@Component({
    selector: 'app-article-edit',
    imports: [EditorComponent, SpinnerComponent, AsyncPipe, ErrorComponent, SidebarActionDirective],
    providers: [LinksService],
    templateUrl: './article-edit.component.html',
    styleUrl: './article-edit.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleEditComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly articleService = inject(ArticleService);
    private readonly notificationService = inject(NotificationService);
    private readonly linksService = inject(LinksService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly logger = inject(LoggerService).withContext('ArticleEditComponent');

    private currentContent: string | undefined = undefined;

    private readonly updateLinksStateSubject = new BehaviorSubject<Record<string, boolean>>({});

    readonly version = signal<ArticleVersion | undefined>(undefined);
    readonly isLoading = signal<boolean>(false);
    readonly isSaving = signal<boolean>(false);
    readonly error = signal<string | undefined>(undefined);
    readonly updateLinksState$ = this.updateLinksStateSubject.asObservable();

    ngOnInit(): void {
        this.route.paramMap
            .pipe(
                map(params => {
                    const idParam = params.get('id');
                    return idParam ? parseInt(idParam, 10) : NaN;
                }),
                distinctUntilChanged(),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(id => {
                if (isNaN(id) || id <= 0) {
                    this.version.set(undefined);
                    this.error.set('Неверный ID версии');
                    this.logger.error('Invalid version ID', id);
                    this.isLoading.set(false);
                    return;
                }

                this.loadVersion(id);
            });
    }

    private loadVersion(versionId: number): void {
        this.version.set(undefined);
        this.isLoading.set(true);
        this.error.set(undefined);

        this.articleService
            .getArticleVersion(versionId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: version => {
                    this.version.set(version);
                    this.isLoading.set(false);
                    this.logger.info('Version loaded for editing', {
                        versionId: version.versionId,
                        articleId: version.articleId,
                        title: version.title,
                    });
                },
                error: (err: HttpErrorResponse) => {
                    this.version.set(undefined);
                    if (err.status === 404) {
                        this.error.set('Версия не найдена');
                    } else if (err.status === 403) {
                        this.error.set('Доступ запрещён');
                    } else {
                        this.error.set('Ошибка загрузки версии');
                    }
                    this.isLoading.set(false);
                },
            });
    }

    updateLinks(links: string[]): void {
        this.linksService
            .getLinkStatuses(links)
            .pipe(first())
            .subscribe({
                next: linksState => {
                    this.updateLinksStateSubject.next(linksState);
                },
                error: err => {
                    this.logger.error('Failed to check link statuses', err);
                },
            });
    }

    contentChanged(content: string): void {
        this.currentContent = content;
        this.logger.debug('Content changed', { length: content.length });
    }

    save(): void {
        const version = this.version();
        if (!version || this.isSaving()) {
            return;
        }

        const content = this.currentContent ?? version.content;

        if (content === version.content) {
            this.notificationService.info('Нет изменений для сохранения');
            return;
        }

        this.isSaving.set(true);
        this.logger.info('Saving article', {
            versionId: version.versionId,
            articleId: version.articleId,
            contentLength: content.length,
        });

        this.articleService
            .saveArticleVersion({
                versionId: version.versionId,
                content,
            })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: result => {
                    this.isSaving.set(false);
                    this.logger.info('Article saved', {
                        newVersionId: result.versionId,
                        articleId: result.articleId,
                    });
                    this.notificationService.success('Статья сохранена');
                    this.router.navigate(['/articles', result.articleId]);
                },
                error: (err: HttpErrorResponse) => {
                    this.isSaving.set(false);
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
        const version = this.version();
        if (version) {
            this.router.navigate(['/articles', version.articleId]);
        } else {
            this.router.navigate(['/']);
        }
    }
}
