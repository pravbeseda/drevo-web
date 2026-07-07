import { inPageAnchorId } from './in-page-anchor';
import { WikiClickHandler } from './wiki-click-handler';
import { inject, Injectable } from '@angular/core';
import { WINDOW } from '@drevo-web/core';

@Injectable()
export class AnchorClickHandler implements WikiClickHandler {
    private readonly window = inject(WINDOW);

    handleClick(event: MouseEvent, target: HTMLElement, host: HTMLElement): boolean {
        const anchor = target.closest('a');
        if (!anchor) {
            return false;
        }

        const href = anchor.getAttribute('href');
        const anchorId = href ? inPageAnchorId(href, this.window?.location) : undefined;
        if (!anchorId) {
            return false;
        }

        event.preventDefault();
        this.scrollToAnchor(anchorId, host);
        return true;
    }

    private scrollToAnchor(anchorId: string, host: HTMLElement): void {
        // Scope the lookup to this wiki-content instance so an in-page anchor
        // inside the footnote modal scrolls its own content, not the article
        // behind the backdrop (another instance may share the same id).
        const escapedId = CSS.escape(anchorId);
        const element = host.querySelector(`#${escapedId}`) || host.querySelector(`[name="${escapedId}"]`);

        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            const url = `${this.window?.location.pathname}${this.window?.location.search}#${anchorId}`;
            this.window?.history.pushState(undefined, '', url);
        }
    }
}
