import { ArticleService } from '../../../services/articles';
import { MissingArticle } from '../models/missing-article';
import { computed, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoggerService } from '@drevo-web/core';
import { ApprovalStatus, ArticleVersion, encodeArticleTitle } from '@drevo-web/shared';

@Injectable()
export class ArticlePageService {
    private readonly logger = inject(LoggerService).withContext('ArticlePageService');
    private readonly articleService = inject(ArticleService);

    private readonly _article = signal<ArticleVersion | undefined>(undefined);
    private readonly _missing = signal<MissingArticle | undefined>(undefined);
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
    readonly missing = this._missing.asReadonly();
    readonly error = this._error.asReadonly();
    readonly articleId = computed(() => this.article()?.articleId);

    readonly isMissing = computed(() => !!this._missing());
    readonly title = computed(() => this.article()?.title ?? this._missing()?.title);
    readonly editUrl = computed(() => {
        const article = this.article();
        return article ? `/articles/${article.articleId}/version/${article.versionId}/edit` : undefined;
    });

    /** Route prefix of the current page — either an existing article or a find placeholder. */
    readonly basePath = computed(() => {
        const id = this.articleId();
        if (id) {
            return `/articles/${id}`;
        }
        const missing = this._missing();
        return missing ? `/articles/find/${encodeArticleTitle(missing.title)}` : undefined;
    });

    readonly canCreate = computed(() => this._missing()?.canCreate ?? false);
    readonly createUrl = computed(() => {
        const base = this.basePath();
        return base && this.canCreate() ? `${base}/edit` : undefined;
    });

    setArticle(article: ArticleVersion): void {
        this._article.set(article);
        this._missing.set(undefined);
        this._error.set(undefined);
        this.logger.info('Article set from resolver', {
            id: article.articleId,
            title: article.title,
        });
    }

    setMissing(missing: MissingArticle): void {
        this._article.set(undefined);
        this._missing.set(missing);
        this._error.set(undefined);
        this.logger.info('Missing article set from resolver', {
            title: missing.title,
            canCreate: missing.canCreate,
        });
    }

    setError(message: string): void {
        this._article.set(undefined);
        this._missing.set(undefined);
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
