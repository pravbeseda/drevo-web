import {
    Directive,
    ElementRef,
    inject,
    OnDestroy,
    OnInit,
} from '@angular/core';
import { Router } from '@angular/router';

/**
 * Directive that intercepts clicks on internal links within dynamic HTML content
 * and navigates using Angular Router instead of full page reload.
 *
 * This is useful for rendering HTML content with links (e.g., from API)
 * that should use client-side navigation.
 *
 * @example
 * ```html
 * <div [innerHTML]="article.content" uiInternalLinks></div>
 * ```
 *
 * The directive intercepts clicks on links that:
 * - Have href starting with "/" (internal links)
 * - Are not external links (http://, https://, mailto:, etc.)
 */
@Directive({
    selector: '[uiInternalLinks]',
})
export class InternalLinksDirective implements OnInit, OnDestroy {
    private readonly elementRef = inject(ElementRef<HTMLElement>);
    private readonly router = inject(Router);

    private readonly clickHandler = (event: MouseEvent): void => {
        const target = event.target as HTMLElement;
        const anchor = target.closest('a');

        if (!anchor) {
            return;
        }

        const href = anchor.getAttribute('href');

        if (!href) {
            return;
        }

        // Only handle internal links (starting with /)
        // Skip external links and special protocols
        if (this.isInternalLink(href)) {
            event.preventDefault();
            this.router.navigateByUrl(href);
        }
    };

    ngOnInit(): void {
        this.elementRef.nativeElement.addEventListener(
            'click',
            this.clickHandler
        );
    }

    ngOnDestroy(): void {
        this.elementRef.nativeElement.removeEventListener(
            'click',
            this.clickHandler
        );
    }

    /**
     * Check if the href is an internal link that should be handled by Angular Router
     */
    private isInternalLink(href: string): boolean {
        // Internal links start with /
        if (!href.startsWith('/')) {
            return false;
        }

        // Skip hash-only links
        if (href.startsWith('/#')) {
            return false;
        }

        return true;
    }
}
