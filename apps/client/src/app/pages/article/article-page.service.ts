import { ArticleService } from '../../services/articles';
import { HttpErrorResponse } from '@angular/common/http';
import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { LoggerService } from '@drevo-web/core';
import { ArticleVersion } from '@drevo-web/shared';
import { distinctUntilChanged, map } from 'rxjs/operators';

@Injectable()
export class ArticlePageService {
    private readonly articleService = inject(ArticleService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly logger = inject(LoggerService).withContext('ArticlePageService');

    private readonly _article = signal<ArticleVersion | undefined>(undefined);
    private readonly _isLoading = signal(false);
    private readonly _error = signal<string | undefined>(undefined);
    private readonly _articleId = signal<number | undefined>(undefined);

    readonly article = this._article.asReadonly();
    readonly isLoading = this._isLoading.asReadonly();
    readonly error = this._error.asReadonly();
    readonly articleId = this._articleId.asReadonly();

    readonly title = computed(() => this.article()?.title);
    readonly editUrl = computed(() => {
        const versionId = this.article()?.versionId;
        return versionId ? `/articles/edit/${versionId}` : undefined;
    });

    init(route: ActivatedRoute): void {
        route.paramMap
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
                    this._article.set(undefined);
                    this._articleId.set(undefined);
                    this._error.set('Неверный ID статьи');
                    this._isLoading.set(false);
                    this.logger.error('Invalid article ID', id);
                    return;
                }

                this._articleId.set(id);
                this.loadArticle(id);
            });
    }

    private loadArticle(id: number): void {
        this._article.set(undefined);
        this._isLoading.set(true);
        this._error.set(undefined);

        this.articleService
            .getArticle(id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: article => {
                    this._article.set(article);
                    this._isLoading.set(false);
                    this.logger.info('Article loaded', {
                        id: article.articleId,
                        versionId: article.versionId,
                        title: article.title,
                    });
                },
                error: (err: HttpErrorResponse) => {
                    this._article.set(undefined);
                    this.logger.error('Failed to load article', {
                        id,
                        status: err.status,
                    });
                    this._error.set(err.status === 404 ? 'Статья не найдена' : 'Ошибка загрузки статьи');
                    this._isLoading.set(false);
                },
            });
    }
}
