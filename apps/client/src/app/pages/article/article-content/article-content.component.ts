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
import { LoggerService } from '@drevo-web/core';

/**
 * State interface for managing interactive content visibility
 * TODO: Remove when migrating wiki formatter to Angular
 */
interface ContentInteractionState {
    commentsExpanded: boolean;
    rusVisible: boolean;
    cslVisible: boolean;
}

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
 * <app-article-content [content]="article.content" />
 * ```
 */
@Component({
    selector: 'app-article-content',
    template: '<div [innerHTML]="sanitizedContent"></div>',
    styleUrls: ['./article-content.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleContentComponent implements OnInit, OnDestroy {
    private _content = '';
    private _sanitizedContent: SafeHtml = '';

    /**
     * State for managing interactive content visibility (comments, translations)
     * TODO: Remove when migrating wiki formatter to Angular
     */
    private interactionState: ContentInteractionState = {
        commentsExpanded: true,
        rusVisible: true,
        cslVisible: true,
    };

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
    private readonly logger =
        inject(LoggerService).withContext('ArticleContent');

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

        // Handle javascript: protocol links (legacy interactive features)
        // TODO: Remove when migrating wiki formatter to Angular
        // Normalize href to prevent bypass attempts (JavaScript:, java script:, etc.)
        const normalizedHref = href.trim().toLowerCase().replace(/\s+/g, '');
        if (
            normalizedHref.startsWith('javascript:') ||
            normalizedHref.startsWith('data:') ||
            normalizedHref.startsWith('vbscript:')
        ) {
            event.preventDefault();
            this.handleJavaScriptAction(href);
            return;
        }

        // Handle anchor links (hash-only links like #section-id)
        if (this.isAnchorLink(href)) {
            event.preventDefault();
            const anchorId = href.substring(1); // Remove '#'
            this.scrollToAnchor(anchorId);
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

    /**
     * Check if the href is an anchor link (hash-only link like #section-id)
     */
    private isAnchorLink(href: string): boolean {
        return href.startsWith('#') && href.length > 1;
    }

    /**
     * Scroll to an element with the given anchor ID with smooth behavior
     */
    private scrollToAnchor(anchorId: string): void {
        // Find element by id or name attribute
        const element =
            document.getElementById(anchorId) ||
            document.querySelector(`[name="${CSS.escape(anchorId)}"]`);

        if (element) {
            // Use native scrollIntoView for smooth scrolling
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });

            // Add to browser history with full path to enable back/forward navigation
            const url = `${window.location.pathname}${window.location.search}#${anchorId}`;
            history.pushState(undefined, '', url);
        }
    }

    // ========================================================================
    // Legacy interactive features support (TODO: Remove after wiki formatter migration)
    // ========================================================================

    /**
     * Handle javascript: protocol links from legacy content
     * @param href - The href attribute value (e.g., "javascript:toggleAll()")
     */
    private handleJavaScriptAction(href: string): void {
        // Whitelist of allowed actions to prevent code injection
        const allowedActions = ['toggleAll', 'toggleRus', 'toggleCsl'] as const;
        
        // Extract action name using regex that matches only safe patterns
        // Matches: javascript:actionName or javascript:actionName()
        const match = /^javascript:([a-zA-Z]+)(?:\(\))?$/i.exec(href.trim());
        
        if (!match) {
            this.logger.warn('Invalid javascript action format', { href });
            return;
        }
        
        const action = match[1];

        switch (action) {
            case 'toggleAll':
                this.toggleAll();
                break;
            case 'toggleRus':
                this.toggleRus();
                break;
            case 'toggleCsl':
                this.toggleCsl();
                break;
            default:
                this.logger.warn('Unknown javascript action', { action, href });
                break;
        }
    }

    /**
     * Toggle visibility of all comments
     * Mimics jQuery: toggleAll() function
     */
    private toggleAll(): void {
        const host = this.elementRef.nativeElement;
        const comments = host.querySelectorAll('.cmnt');
        const links = Array.from(
            host.querySelectorAll('.LinkComment')
        ) as HTMLElement[];

        // Check current state from first link
        const isExpanded = links[0]?.textContent?.trim() === 'Свернуть';

        // Update all toggle links
        links.forEach(link => {
            link.textContent = isExpanded ? 'Развернуть' : 'Свернуть';
        });

        // Toggle comments visibility
        comments.forEach((comment: Element) => {
            (comment as HTMLElement).style.display = isExpanded ? 'none' : '';
        });

        // Update state
        this.interactionState.commentsExpanded = !isExpanded;
    }

    /**
     * Toggle visibility of Russian translation
     * Mimics jQuery: toggleRus() function
     */
    private toggleRus(): void {
        const host = this.elementRef.nativeElement;
        const rusElements = Array.from(
            host.querySelectorAll('.BibleRus')
        ) as HTMLElement[];
        const cslElements = Array.from(
            host.querySelectorAll('.BibleCsl')
        ) as HTMLElement[];

        // Toggle Russian elements
        const willBeHidden = rusElements[0]?.style.display !== 'none';
        rusElements.forEach(el => {
            el.style.display = willBeHidden ? 'none' : '';
        });

        // If hiding Russian, ensure Church Slavonic is visible
        if (willBeHidden) {
            cslElements.forEach(el => {
                el.style.display = '';
            });
            this.interactionState.cslVisible = true;
        }

        // Update state and links
        this.interactionState.rusVisible = !willBeHidden;
        this.updateBibleLinks();
    }

    /**
     * Toggle visibility of Church Slavonic translation
     * Mimics jQuery: toggleCsl() function
     */
    private toggleCsl(): void {
        const host = this.elementRef.nativeElement;
        const cslElements = Array.from(
            host.querySelectorAll('.BibleCsl')
        ) as HTMLElement[];
        const rusElements = Array.from(
            host.querySelectorAll('.BibleRus')
        ) as HTMLElement[];

        // Toggle Church Slavonic elements
        const willBeHidden = cslElements[0]?.style.display !== 'none';
        cslElements.forEach(el => {
            el.style.display = willBeHidden ? 'none' : '';
        });

        // If hiding Church Slavonic, ensure Russian is visible
        if (willBeHidden) {
            rusElements.forEach(el => {
                el.style.display = '';
            });
            this.interactionState.rusVisible = true;
        }

        // Update state and links
        this.interactionState.cslVisible = !willBeHidden;
        this.updateBibleLinks();
    }

    /**
     * Toggle visibility of elements by class name
     * Mimics jQuery: toggleGroup(cl) function
     */
    private toggleGroup(className: string): void {
        const host = this.elementRef.nativeElement;
        const elements = Array.from(
            host.querySelectorAll(`.${className}`)
        ) as HTMLElement[];

        elements.forEach(el => {
            el.style.display = el.style.display === 'none' ? '' : 'none';
        });
    }

    /**
     * Update text of Bible translation toggle links
     * Mimics jQuery: checkBibleLinks() function
     */
    private updateBibleLinks(): void {
        const host = this.elementRef.nativeElement;
        const rusLinks = Array.from(
            host.querySelectorAll('.toggleRus')
        ) as HTMLElement[];
        const cslLinks = Array.from(
            host.querySelectorAll('.toggleCsl')
        ) as HTMLElement[];

        const rusText = this.interactionState.rusVisible
            ? 'Скрыть русский перевод'
            : 'Показать русский перевод';
        const cslText = this.interactionState.cslVisible
            ? 'Скрыть церковнославянский перевод'
            : 'Показать церковнославянский перевод';

        rusLinks.forEach(link => {
            link.textContent = rusText;
        });

        cslLinks.forEach(link => {
            link.textContent = cslText;
        });
    }
}
