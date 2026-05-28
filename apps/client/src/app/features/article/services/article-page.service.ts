import { ArticleService } from '../../../services/articles';
import { computed, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoggerService } from '@drevo-web/core';
import { ApprovalStatus, ArticleVersion } from '@drevo-web/shared';

@Injectable()
export class ArticlePageService {
    private readonly logger = inject(LoggerService).withContext('ArticlePageService');
    private readonly articleService = inject(ArticleService);

    private readonly _article = signal<ArticleVersion | undefined>(undefined);
    private readonly _error = signal<string | undefined>(undefined);

    constructor() {
        this.articleService.renamed$.pipe(takeUntilDestroyed()).subscribe(({ articleId, title }) => {
            const current = this._article();
            if (current?.articleId === articleId && current.title !== title) {
                this._article.set({ ...current, title });
                this.logger.info('Article title synced from rename event', { articleId, title });
            }
        });
    }

    readonly article = this._article.asReadonly();
    readonly error = this._error.asReadonly();
    readonly articleId = computed(() => this.article()?.articleId);

    readonly title = computed(() => this.article()?.title);
    readonly editUrl = computed(() => {
        const article = this.article();
        return article ? `/articles/${article.articleId}/version/${article.versionId}/edit` : undefined;
    });

    setArticle(article: ArticleVersion): void {
        this._article.set(article);
        this._error.set(undefined);
        this.logger.info('Article set from resolver', {
            id: article.articleId,
            title: article.title,
        });
    }

    setError(message: string): void {
        this._article.set(undefined);
        this._error.set(message);
        this.logger.error('Article error', { message });
    }

    updateTopics(topics: ReadonlyArray<number>): void {
        const current = this._article();
        if (!current) {
            return;
        }

        this._article.set({ ...current, topics });
        this.logger.info('Article topics updated', {
            id: current.articleId,
            topics,
        });
    }

    updateApproval(approved: ApprovalStatus, comment: string): void {
        const current = this._article();
        if (!current) {
            return;
        }

        this._article.set({ ...current, approved, comment });
        this.logger.info('Article approval updated', {
            id: current.articleId,
            approved,
        });
    }
}
