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
        if (!href || !this.isAnchorLink(href)) {
            return false;
        }

        event.preventDefault();
        this.scrollToAnchor(href.substring(1));
        return true;
    }

    private isAnchorLink(href: string): boolean {
        return href.startsWith('#') && href.length > 1;
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
