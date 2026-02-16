import { computed, inject, Injectable, signal } from '@angular/core';
import { LoggerService } from '@drevo-web/core';
import { ArticleVersion } from '@drevo-web/shared';

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
        const versionId = this.article()?.versionId;
        return versionId ? `/articles/edit/${versionId}` : undefined;
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
}
