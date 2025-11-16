import { isPlatformBrowser, DOCUMENT } from '@angular/common';
import { Component, Inject, OnDestroy, PLATFORM_ID } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

@Component({
    imports: [RouterModule],
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss',
})
export class AppComponent implements OnDestroy {
    private readonly isBrowser: boolean;
    private readonly handleClick = (event: MouseEvent): void =>
        this.processClick(event);

    constructor(
        private readonly router: Router,
        @Inject(DOCUMENT) private readonly document: Document,
        @Inject(PLATFORM_ID) platformId: object
    ) {
        console.log('AppComponent initialized!!!');
        this.isBrowser = isPlatformBrowser(platformId);
        if (this.isBrowser) {
            this.document.addEventListener('click', this.handleClick);
        }
    }

    ngOnDestroy(): void {
        if (this.isBrowser) {
            this.document.removeEventListener('click', this.handleClick);
        }
    }

    private processClick(event: MouseEvent): void {
        if (
            event.defaultPrevented ||
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey
        ) {
            return;
        }

        const target = event.target as HTMLElement | null;
        const anchor = target?.closest?.('a[href]');
        if (!anchor) {
            return;
        }

        const htmlAnchor = anchor as HTMLAnchorElement;
        const href = htmlAnchor.getAttribute('href');

        if (!href || href.startsWith('#') || htmlAnchor.hasAttribute('download')) {
            return;
        }

        const targetAttr = htmlAnchor.getAttribute('target');
        if (targetAttr && targetAttr !== '_self') {
            return;
        }

        let url: URL;
        try {
            url = new URL(htmlAnchor.href, this.document.location.origin);
        } catch {
            return;
        }

        if (url.origin !== this.document.location.origin) {
            return;
        }

        event.preventDefault();
        const navigationUrl = `${url.pathname}${url.search}${url.hash}`;
        this.router.navigateByUrl(navigationUrl);
    }
}
