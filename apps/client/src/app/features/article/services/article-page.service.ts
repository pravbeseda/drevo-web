import { computed, inject, Injectable, signal } from '@angular/core';
import { LoggerService } from '@drevo-web/core';
import { ApprovalStatus, ArticleVersion } from '@drevo-web/shared';

@Injectable()
export class ArticlePageService {
    private readonly logger = inject(LoggerService).withContext('ArticlePageService');

    private readonly _article = signal<ArticleVersion | undefined>(undefined);
    private readonly _error = signal<string | undefined>(undefined);

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
