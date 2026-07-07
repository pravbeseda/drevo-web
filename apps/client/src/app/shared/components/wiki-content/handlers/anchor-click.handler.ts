import { WikiClickHandler } from './wiki-click-handler';
import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { WINDOW } from '@drevo-web/core';

@Injectable()
export class AnchorClickHandler implements WikiClickHandler {
    private readonly document = inject(DOCUMENT);
    private readonly window = inject(WINDOW);

    handleClick(event: MouseEvent, target: HTMLElement): boolean {
        const anchor = target.closest('a');
        if (!anchor) {
            return false;
        }

        const href = anchor.getAttribute('href');
        const anchorId = href ? this.getInPageAnchorId(href) : undefined;
        if (!anchorId) {
            return false;
        }

        event.preventDefault();
        this.scrollToAnchor(anchorId);
        return true;
    }

    /**
     * Returns the target id for an in-page anchor, or `undefined` if the link is
     * not a same-page fragment link. Handles both bare fragments (`#fn5`) and
     * fragments made absolute to the current page (`/articles/1#fn5`), which is
     * how {@link resolveFragmentLinks} rewrites them for correct new-tab opening.
     */
    private getInPageAnchorId(href: string): string | undefined {
        if (href.startsWith('#')) {
            return href.length > 1 ? href.substring(1) : undefined;
        }

        const location = this.window?.location;
        if (!location) {
            return undefined;
        }

        const prefix = `${location.pathname}${location.search}#`;
        return href.startsWith(prefix) && href.length > prefix.length ? href.substring(prefix.length) : undefined;
    }

    private scrollToAnchor(anchorId: string): void {
        const element =
            this.document.getElementById(anchorId) || this.document.querySelector(`[name="${CSS.escape(anchorId)}"]`);

        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            const url = `${this.window?.location.pathname}${this.window?.location.search}#${anchorId}`;
            this.window?.history.pushState(undefined, '', url);
        }
    }
}
