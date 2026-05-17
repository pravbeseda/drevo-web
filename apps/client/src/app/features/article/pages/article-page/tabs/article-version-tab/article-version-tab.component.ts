import { ArticleService } from '../../../../../../services/articles';
import { ArticleContentComponent } from '../../../../components/article-content/article-content.component';
import { ArticleSidebarActionsComponent } from '../../../../components/article-sidebar-actions/article-sidebar-actions.component';
import { ArticlePageService } from '../../../../services/article-page.service';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LoggerService } from '@drevo-web/core';
import { ArticleVersion, ModerationResult } from '@drevo-web/shared';
import { BannerComponent, FormatTimePipe, SpinnerComponent, StatusIconComponent } from '@drevo-web/ui';
import { distinctUntilChanged, map } from 'rxjs/operators';

@Component({
    selector: 'app-article-version-tab',
    imports: [ArticleContentComponent, ArticleSidebarActionsComponent, BannerComponent, RouterLink, FormatTimePipe, StatusIconComponent, SpinnerComponent],
    templateUrl: './article-version-tab.component.html',
    styleUrl: './article-version-tab.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleVersionTabComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly articleService = inject(ArticleService);
    private readonly pageService = inject(ArticlePageService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly logger = inject(LoggerService).withContext('ArticleVersionTab');

    private readonly _version = signal<ArticleVersion | undefined>(undefined);
    private readonly _isLoading = signal(false);
    private readonly _error = signal<string | undefined>(undefined);

    readonly version = this._version.asReadonly();
    readonly isLoading = this._isLoading.asReadonly();
    readonly error = this._error.asReadonly();

    readonly articleUrl = computed(() => {
        const id = this.pageService.articleId();
        return id ? `/articles/${id}` : undefined;
    });

    readonly versionEditUrl = computed(() => {
        const v = this.version();
        return v ? `/articles/${v.articleId}/version/${v.versionId}/edit` : undefined;
    });

    onModerated(result: ModerationResult): void {
        this._version.update(v => (v ? { ...v, approved: result.approved, comment: result.comment } : v));
    }

    onTopicsChanged(topics: ReadonlyArray<number>): void {
        this._version.update(v => (v ? { ...v, topics } : v));
    }

    ngOnInit(): void {
        this.route.paramMap
            .pipe(
                map(params => {
                    const idParam = params.get('versionId');
                    return idParam ? parseInt(idParam, 10) : NaN;
                }),
                distinctUntilChanged(),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(versionId => {
                if (isNaN(versionId) || versionId <= 0) {
                    this._version.set(undefined);
                    this._error.set('Неверный ID версии');
                    this._isLoading.set(false);
                    this.logger.error('Invalid version ID', versionId);
                    return;
                }

                this.loadVersion(versionId);
            });
    }

    private loadVersion(versionId: number): void {
        this._version.set(undefined);
        this._isLoading.set(true);
        this._error.set(undefined);

        this.articleService
            .getVersionShow(versionId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: version => {
                    const expectedArticleId = this.pageService.articleId();
                    if (expectedArticleId && version.articleId !== expectedArticleId) {
                        this.logger.info('Version belongs to different article, redirecting', {
                            versionId: version.versionId,
                            urlArticleId: expectedArticleId,
                            actualArticleId: version.articleId,
                        });
                        this.router.navigate(['/articles', version.articleId, 'version', version.versionId], {
                            replaceUrl: true,
                        });
                        return;
                    }

                    this._version.set(version);
                    this._isLoading.set(false);
                    this.logger.info('Version loaded', {
                        articleId: version.articleId,
                        versionId: version.versionId,
                    });
                },
                error: (err: HttpErrorResponse) => {
                    this._version.set(undefined);
                    this.logger.error('Failed to load version', {
                        versionId,
                        status: err.status,
                    });
                    this._error.set(err.status === 404 ? 'Версия не найдена' : 'Ошибка загрузки версии');
                    this._isLoading.set(false);
                },
            });
    }
}
