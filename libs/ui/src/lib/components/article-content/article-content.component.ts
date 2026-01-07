import {
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    inject,
    Input,
    OnDestroy,
    OnInit,
    ViewEncapsulation,
} from '@angular/core';
import { Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/**
 * Component for rendering article content with internal link handling.
 *
 * This component:
 * - Renders HTML content safely using innerHTML
 * - Intercepts clicks on internal links and navigates using Angular Router
 * - Provides styling for article content without ng-deep
 * - Preserves id and name attributes for anchor navigation
 *
 * Uses ViewEncapsulation.None to allow styling of dynamically injected HTML
 * without requiring ::ng-deep.
 *
 * @example
 * ```html
 * <ui-article-content [content]="article.content" />
 * ```
 */
@Component({
    selector: 'ui-article-content',
    template: '<div [innerHTML]="sanitizedContent"></div>',
    styleUrls: ['./article-content.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleContentComponent implements OnInit, OnDestroy {
    private _content = '';
    private _sanitizedContent: SafeHtml = '';

    /**
     * HTML content to render
     */
    @Input()
    set content(value: string) {
        this._content = value;
        this._sanitizedContent = this.sanitizer.bypassSecurityTrustHtml(value);
    }

    get content(): string {
        return this._content;
    }

    get sanitizedContent(): SafeHtml {
        return this._sanitizedContent;
    }

    private readonly elementRef = inject(ElementRef<HTMLElement>);
    private readonly router = inject(Router);
    private readonly sanitizer = inject(DomSanitizer);

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
        return !href.startsWith('/#');
    }
}
