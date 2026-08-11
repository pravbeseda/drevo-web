import { ArticleService } from './articles';
import { computed, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { LoggerService } from '@drevo-web/core';

const DEFAULT_TITLE = 'Древо';
const TITLE_SUFFIX = ' - Древо';
const MAX_TITLE_LENGTH = 50;
const ARTICLE_TITLE_SOURCE = 'article';

/** Reads the `title` a route's resolved data carries, `undefined` when it carries none. */
function readTitle(data: unknown): string | undefined {
    if (typeof data === 'object' && data && 'title' in data && typeof data.title === 'string') {
        return data.title;
    }

    return undefined;
}

export interface TitleContext {
    readonly articleId: number;
    readonly title: string;
}

@Injectable()
export class PageTitleStrategy extends TitleStrategy {
    private readonly title = inject(Title);
    private readonly logger = inject(LoggerService).withContext('PageTitleStrategy');
    private readonly articleService = inject(ArticleService);

    private readonly _tabTitle = signal<string | undefined>(undefined);
    private readonly _titleContext = signal<TitleContext | undefined>(undefined);
    private readonly _titlePrefix = signal<string | undefined>(undefined);

    readonly titleContext = this._titleContext.asReadonly();
    readonly tabTitle = this._tabTitle.asReadonly();

    readonly pageTitle = computed(() => {
        const tab = this._tabTitle();
        const ctx = this._titleContext();
        if (tab && ctx) return `${tab}: ${ctx.title}`;
        if (tab) return tab;
        if (ctx) return ctx.title;
        return DEFAULT_TITLE;
    });

    constructor() {
        super();
        this.articleService.renamed$.pipe(takeUntilDestroyed()).subscribe(({ articleId, title }) => {
            const ctx = this._titleContext();
            if (ctx?.articleId === articleId) {
                this._titleContext.set({ articleId, title });
                this.applyDocumentTitle();
            }
        });
    }

    override updateTitle(snapshot: RouterStateSnapshot): void {
        const chain = this.getRouteChain(snapshot);
        const source = this.findTitleSource(chain);

        if (source?.key === ARTICLE_TITLE_SOURCE) {
            // `Data` is an index signature of `any`; the guards below only mean something
            // once the value is read as `unknown`.
            const articleData: unknown = source.route.data[source.key];
            if (this.isTitleContext(articleData)) {
                const current = this._titleContext();
                // Preserve current context if articleId matches — it may hold a
                // freshly renamed title that route snapshot data doesn't yet reflect.
                // Only real articles (articleId > 0) are deduped this way: the
                // missing-article placeholder always uses articleId 0, so distinct
                // missing titles would otherwise wrongly keep the previous title.
                const isSameRealArticle =
                    !!current && current.articleId === articleData.articleId && articleData.articleId > 0;
                if (!isSameRealArticle) {
                    this._titleContext.set({ articleId: articleData.articleId, title: articleData.title });
                }
            } else {
                // articleData === undefined is a normal failure path from articleResolver
                // (bad id, 404, network error) — don't warn on it.
                if (articleData !== undefined) {
                    this.logger.warn('Article route data does not match TitleContext shape', { articleData });
                }
                this._titleContext.set(undefined);
            }
            this._tabTitle.set(this.buildTitle(snapshot));
        } else if (source) {
            const data: unknown = source.route.data[source.key];
            this._titleContext.set(undefined);
            this._tabTitle.set(readTitle(data));
        } else {
            this._titleContext.set(undefined);
            this._tabTitle.set(this.buildTitle(snapshot));
        }

        const leaf = chain.at(-1);
        const titlePrefix: unknown = leaf?.data['titlePrefix'];
        this._titlePrefix.set(typeof titlePrefix === 'string' ? titlePrefix : undefined);

        this.applyDocumentTitle();
        this.logger.debug('Title updated', { title: this.pageTitle() });
    }

    private applyDocumentTitle(): void {
        const tab = this._tabTitle();
        const ctx = this._titleContext();
        const prefix = this._titlePrefix();

        let docTitle: string;
        if (tab && ctx) {
            docTitle = `${tab}: ${this.truncateTitle(ctx.title)}`;
        } else if (tab) {
            docTitle = tab;
        } else if (ctx) {
            docTitle = this.truncateTitle(ctx.title);
        } else {
            this.title.setTitle(DEFAULT_TITLE);
            return;
        }

        if (prefix) {
            docTitle = `${prefix} ${docTitle}`;
        }
        this.title.setTitle(`${docTitle}${TITLE_SUFFIX}`);
    }

    private isTitleContext(value: unknown): value is TitleContext {
        return (
            typeof value === 'object' &&
            !!value &&
            typeof (value as TitleContext).articleId === 'number' &&
            typeof (value as TitleContext).title === 'string'
        );
    }

    private findTitleSource(
        chain: ActivatedRouteSnapshot[],
    ): { readonly key: string; readonly route: ActivatedRouteSnapshot } | undefined {
        for (let i = chain.length - 1; i >= 0; i--) {
            const key = chain[i].data['titleSource'] as string | undefined;
            if (key !== undefined) {
                return { key, route: chain[i] };
            }
        }
        return undefined;
    }

    private truncateTitle(title: string): string {
        if (title.length <= MAX_TITLE_LENGTH) {
            return title;
        }
        return title.slice(0, MAX_TITLE_LENGTH) + '…';
    }

    private getRouteChain(snapshot: RouterStateSnapshot): ActivatedRouteSnapshot[] {
        const chain: ActivatedRouteSnapshot[] = [];
        let route: ActivatedRouteSnapshot = snapshot.root;
        chain.push(route);
        while (route.firstChild) {
            route = route.firstChild;
            chain.push(route);
        }
        return chain;
    }
}
