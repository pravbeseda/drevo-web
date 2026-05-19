import { inject, Injectable, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { LoggerService } from '@drevo-web/core';

const DEFAULT_TITLE = 'Древо';
const TITLE_SUFFIX = ' - Древо';
const MAX_TITLE_LENGTH = 50;

export interface TitleContext {
    readonly articleId: number;
    readonly title: string;
}

@Injectable()
export class PageTitleStrategy extends TitleStrategy {
    private readonly title = inject(Title);
    private readonly logger = inject(LoggerService).withContext('PageTitleStrategy');
    private readonly _pageTitle = signal(DEFAULT_TITLE);
    readonly pageTitle = this._pageTitle.asReadonly();
    private readonly _titleContext = signal<TitleContext | undefined>(undefined);
    readonly titleContext = this._titleContext.asReadonly();

    override updateTitle(snapshot: RouterStateSnapshot): void {
        const resolved = this.resolveTitle(snapshot);

        if (resolved) {
            this._pageTitle.set(resolved.title);
            const truncated = this.truncateTitle(resolved.title);
            const titlePrefix = resolved.route.data['titlePrefix'] as string | undefined;
            const docTitle = titlePrefix ? `${titlePrefix} ${truncated}` : truncated;
            this.title.setTitle(`${docTitle}${TITLE_SUFFIX}`);

            const titleSource = resolved.route.data['titleSource'] as string | undefined;
            if (titleSource === 'article') {
                const articleData = resolved.route.data['article'];
                if (this.isTitleContext(articleData)) {
                    this._titleContext.set({ articleId: articleData.articleId, title: articleData.title });
                } else {
                    this.logger.warn('Article route data does not match TitleContext shape', { articleData });
                    this._titleContext.set(undefined);
                }
            } else {
                this._titleContext.set(undefined);
            }
        } else {
            this._pageTitle.set(DEFAULT_TITLE);
            this.title.setTitle(DEFAULT_TITLE);
            this._titleContext.set(undefined);
        }

        this.logger.debug('Title updated', { title: resolved?.title ?? DEFAULT_TITLE });
    }

    private isTitleContext(value: unknown): value is TitleContext {
        return (
            typeof value === 'object' &&
            value !== null &&
            typeof (value as TitleContext).articleId === 'number' &&
            typeof (value as TitleContext).title === 'string'
        );
    }

    updateArticleTitle(newTitle: string): void {
        this._pageTitle.set(newTitle);
        const ctx = this._titleContext();
        if (ctx) {
            this._titleContext.set({ ...ctx, title: newTitle });
        }
        const truncated = this.truncateTitle(newTitle);
        this.title.setTitle(`${truncated}${TITLE_SUFFIX}`);
    }

    /**
     * Resolve page title and the route it came from.
     * First tries standard `buildTitle()` (explicit `title` on the route).
     * If no explicit title, searches route chain for `titleSource` data key
     * and reads title from the resolved data object (e.g. `data['article'].title`).
     */
    private resolveTitle(
        snapshot: RouterStateSnapshot,
    ): { readonly title: string; readonly route: ActivatedRouteSnapshot } | undefined {
        const builtTitle = this.buildTitle(snapshot);
        if (builtTitle) {
            const chain = this.getRouteChain(snapshot);
            return { title: builtTitle, route: chain[chain.length - 1] };
        }

        const result = this.findRouteData(snapshot, 'titleSource');
        if (result) {
            const resolved = result.route.data[result.value as string] as { readonly title: string } | undefined;
            if (resolved?.title) {
                return { title: resolved.title, route: result.route };
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

    /**
     * Search for a data key from leaf route up to root.
     * Returns the value and the route where it was found.
     */
    private findRouteData(
        snapshot: RouterStateSnapshot,
        key: string,
    ): { readonly value: unknown; readonly route: ActivatedRouteSnapshot } | undefined {
        const chain = this.getRouteChain(snapshot);
        for (let i = chain.length - 1; i >= 0; i--) {
            const value = chain[i].data[key];
            if (value !== undefined) {
                return { value, route: chain[i] };
            }
        }
        return undefined;
    }

    private getRouteChain(snapshot: RouterStateSnapshot): ActivatedRouteSnapshot[] {
        const chain: ActivatedRouteSnapshot[] = [];
        if (!snapshot.root) return chain;
        let route: ActivatedRouteSnapshot = snapshot.root;
        chain.push(route);
        while (route.firstChild) {
            route = route.firstChild;
            chain.push(route);
        }
        return chain;
    }
}
