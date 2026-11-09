import { PageContext } from '../../../shared/services/page-context/page-context';
import { computed, inject, Injectable, signal } from '@angular/core';
import { LoggerService } from '@drevo-web/core';
import { ApprovalStatus, ArticleVersion, NewsMeta, NewsTopic, PageKind } from '@drevo-web/shared';

/** The news item a news page holds, and the sections it is in. */
@Injectable()
export class NewsPageService implements PageContext {
    readonly kind: PageKind = 'news';

    private readonly logger = inject(LoggerService).withContext('NewsPageService');

    private readonly _article = signal<ArticleVersion | undefined>(undefined);
    private readonly _topics = signal<readonly NewsTopic[]>([]);
    private readonly _error = signal<string | undefined>(undefined);
    private readonly _isNotFound = signal(false);

    readonly article = this._article.asReadonly();
    readonly error = this._error.asReadonly();
    readonly isNotFound = this._isNotFound.asReadonly();
    /** Every news section, for a form that moves the news item to another. */
    readonly topics = this._topics.asReadonly();
    readonly articleId = computed(() => this.article()?.articleId);
    readonly title = computed(() => this.article()?.title);

    /** The news item's sections, in its own order; an id with no known section is skipped. */
    readonly sections = computed((): readonly NewsTopic[] => {
        const topics = this._topics();
        return (this.article()?.topics ?? []).flatMap(id => topics.filter(topic => topic.id === id));
    });

    setNews(news: ArticleVersion, topics: readonly NewsTopic[]): void {
        this._article.set(news);
        this._topics.set(topics);
        this._error.set(undefined);
        this._isNotFound.set(false);
        this.logger.info('News item set from resolver', { id: news.articleId, title: news.title });
    }

    setError(message: string): void {
        this._article.set(undefined);
        this._error.set(message);
        this._isNotFound.set(false);
        this.logger.error('News item error', { message });
    }

    /** The address names no news item: a stale link, not a fault, so it is not logged as an error. */
    setNotFound(): void {
        this._article.set(undefined);
        this._error.set(undefined);
        this._isNotFound.set(true);
        this.logger.info('News item not found');
    }

    updateApproval(approved: ApprovalStatus, comment: string): void {
        this._article.update(current => (current ? { ...current, approved, comment } : current));
    }

    /** Takes what a moderator changed about the news item. */
    applyMeta(meta: NewsMeta): void {
        this._article.update(current =>
            current ? { ...current, title: meta.title, newsDate: meta.newsDate, topics: meta.topics } : current,
        );
        this.logger.info('News meta applied', { id: meta.articleId });
    }
}
