import { WikiClickHandler } from './wiki-click-handler';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable()
export class InternalLinkClickHandler implements WikiClickHandler {
    private readonly router = inject(Router);

    handleClick(event: MouseEvent, target: HTMLElement): boolean {
        const anchor = target.closest('a');
        if (!anchor) {
            return false;
        }

        const href = anchor.getAttribute('href');
        if (!href || !this.isInternalLink(href)) {
            return false;
        }

        event.preventDefault();
        this.router.navigateByUrl(href);
        return true;
    }

    private isInternalLink(href: string): boolean {
        return href.startsWith('/') && !href.startsWith('/#');
    }
}
