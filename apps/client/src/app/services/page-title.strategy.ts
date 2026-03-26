import { inject, Injectable, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { LoggerService } from '@drevo-web/core';

const DEFAULT_TITLE = 'Древо';
const TITLE_SUFFIX = ' - Древо';
const MAX_TITLE_LENGTH = 50;

@Injectable()
export class PageTitleStrategy extends TitleStrategy {
    private readonly title = inject(Title);
    private readonly logger = inject(LoggerService).withContext('PageTitleStrategy');
    private readonly _pageTitle = signal(DEFAULT_TITLE);
    readonly pageTitle = this._pageTitle.asReadonly();

    override updateTitle(snapshot: RouterStateSnapshot): void {
        const resolved = this.resolveTitle(snapshot);

        if (resolved) {
            this._pageTitle.set(resolved.title);
            const titlePrefix = resolved.route.data['titlePrefix'] as string | undefined;
            const docTitle = titlePrefix ? `${titlePrefix} ${resolved.title}` : resolved.title;
            this.title.setTitle(`${docTitle}${TITLE_SUFFIX}`);
        } else {
            this._pageTitle.set(DEFAULT_TITLE);
            this.title.setTitle(DEFAULT_TITLE);
        }

        this.logger.debug('Title updated', { title: resolved?.title ?? DEFAULT_TITLE });
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
                return { title: this.truncateTitle(resolved.title), route: result.route };
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
