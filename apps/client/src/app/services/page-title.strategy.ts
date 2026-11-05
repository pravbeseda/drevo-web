import { ArticleService } from './articles';
import { computed, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { LoggerService } from '@drevo-web/core';
import { PageKind } from '@drevo-web/shared';

const DEFAULT_TITLE = 'Древо';
const TITLE_SUFFIX = ' - Древо';
const MAX_TITLE_LENGTH = 50;

/** The `titleSource` keys whose data is a wiki page heading its page, and the kind of that page. */
const PAGE_TITLE_SOURCES: Readonly<Record<string, PageKind>> = {
    article: 'articles',
    news: 'news',
};

/** Reads the `title` a route's resolved data carries, `undefined` when it carries none. */
function readTitle(data: unknown): string | undefined {
    if (typeof data === 'object' && data && 'title' in data && typeof data.title === 'string') {
        return data.title;
    }

    return undefined;
}

/** The wiki page heading the current page. */
export interface TitleContext {
    readonly kind: PageKind;
    readonly articleId: number;
    readonly title: string;
}

/** A line under the page title naming what the page hangs off, e.g. «к статье X». */
export interface PageSubtitle {
    readonly prefix: string;
    readonly label: string;
    readonly link: string;
}

function isPageSubtitle(value: unknown): value is PageSubtitle {
    return (
        typeof value === 'object' &&
        !!value &&
        typeof (value as PageSubtitle).prefix === 'string' &&
        typeof (value as PageSubtitle).label === 'string' &&
        typeof (value as PageSubtitle).link === 'string'
    );
}

@Injectable()
export class PageTitleStrategy extends TitleStrategy {
    private readonly title = inject(Title);
    private readonly logger = inject(LoggerService).withContext('PageTitleStrategy');
    private readonly articleService = inject(ArticleService);

    private readonly _tabTitle = signal<string | undefined>(undefined);
    private readonly _titleContext = signal<TitleContext | undefined>(undefined);
    private readonly _titlePrefix = signal<string | undefined>(undefined);
    private readonly _pageSubtitle = signal<PageSubtitle | undefined>(undefined);

    readonly titleContext = this._titleContext.asReadonly();
    readonly tabTitle = this._tabTitle.asReadonly();
    readonly pageSubtitle = this._pageSubtitle.asReadonly();

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
        this.articleService.renamed$
            .pipe(takeUntilDestroyed())
            .subscribe(({ articleId, title }) => this.retitle('articles', articleId, title));
    }

    /** A page changed its title in place: the heading follows when that page is the one heading it. */
    retitle(kind: PageKind, articleId: number, title: string): void {
        const ctx = this._titleContext();
        if (ctx?.kind === kind && ctx.articleId === articleId) {
            this._titleContext.set({ ...ctx, title });
            this.applyDocumentTitle();
        }
    }

    override updateTitle(snapshot: RouterStateSnapshot): void {
        const chain = this.getRouteChain(snapshot);
        const source = this.findTitleSource(chain);
        const kind =
            source && Object.hasOwn(PAGE_TITLE_SOURCES, source.key) ? PAGE_TITLE_SOURCES[source.key] : undefined;

        if (source && kind) {
            // `Data` is an index signature of `any`; the guards only mean something
            // once the value is read as `unknown`.
            const pageData: unknown = source.route.data[source.key];
            this.applyTitleContext(kind, pageData);
            this._tabTitle.set(this.buildTitle(snapshot));
        } else if (source) {
            const data: unknown = source.route.data[source.key];
            this._titleContext.set(undefined);
            this._tabTitle.set(readTitle(data));
        } else {
            this._titleContext.set(undefined);
            this._tabTitle.set(this.buildTitle(snapshot));
        }

        this.applyLeafData(chain.at(-1));
        this.applyDocumentTitle();
        this.logger.debug('Title updated', { title: this.pageTitle() });
    }

    private applyTitleContext(kind: PageKind, pageData: unknown): void {
        if (!this.isTitleContext(pageData)) {
            // undefined is a normal failure path from the page resolver
            // (bad id, 404, network error) — don't warn on it.
            if (pageData !== undefined) {
                this.logger.warn('Page route data does not match TitleContext shape', { pageData });
            }
            this._titleContext.set(undefined);
            return;
        }

        const current = this._titleContext();
        // Preserve current context if the page matches — it may hold a
        // freshly renamed title that route snapshot data doesn't yet reflect.
        // Only real pages (articleId > 0) are deduped this way: the
        // missing-article placeholder always uses articleId 0, so distinct
        // missing titles would otherwise wrongly keep the previous title.
        const isSameRealPage =
            !!current && current.kind === kind && current.articleId === pageData.articleId && pageData.articleId > 0;
        if (!isSameRealPage) {
            this._titleContext.set({ kind, articleId: pageData.articleId, title: pageData.title });
        }
    }

    /** What only the page itself names: the document title's prefix and the line under the title. */
    private applyLeafData(leaf: ActivatedRouteSnapshot | undefined): void {
        const titlePrefix: unknown = leaf?.data['titlePrefix'];
        this._titlePrefix.set(typeof titlePrefix === 'string' ? titlePrefix : undefined);

        // Under an article the article already heads the page, so a line naming it again is dropped.
        const subtitle: unknown = leaf?.data['subtitle'];
        this._pageSubtitle.set(isPageSubtitle(subtitle) && !this._titleContext() ? subtitle : undefined);
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

    private isTitleContext(value: unknown): value is Omit<TitleContext, 'kind'> {
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
