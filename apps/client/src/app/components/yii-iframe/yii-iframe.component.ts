import {
    Component,
    OnInit,
    OnDestroy,
    AfterViewInit,
    inject,
    PLATFORM_ID,
    ViewChild,
    ElementRef,
    Output,
    EventEmitter,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { LoggerService } from '../../services/logger/logger.service';

/** Message types from Yii iframe */
interface YiiIframeMessage {
    type: 'yii-iframe-loaded' | 'yii-iframe-navigate' | 'yii-iframe-height' | 'yii-navigation';
    url?: string;
    title?: string;
    height?: number;
    path?: string;
    originalHref?: string;
}

@Component({
    selector: 'app-yii-iframe',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './yii-iframe.component.html',
    styleUrls: ['./yii-iframe.component.scss'],
})
export class YiiIframeComponent implements OnInit, OnDestroy, AfterViewInit {
    @ViewChild('yiiFrame', { static: false })
    iframeRef!: ElementRef<HTMLIFrameElement>;

    /** Emitted when page title changes in iframe */
    @Output() titleChange = new EventEmitter<string>();
    
    /** Emitted when iframe content height changes */
    @Output() heightChange = new EventEmitter<number>();

    private readonly router = inject(Router);
    private readonly sanitizer = inject(DomSanitizer);
    private readonly platformId = inject(PLATFORM_ID);
    private readonly logger = inject(LoggerService);
    private readonly destroy$ = new Subject<void>();
    private readonly isBrowser: boolean;
    private pendingIframeNavigationPath: string | null = null;
    private iframeInitialized = false;
    private currentIframePath: string | null = null;
    private readonly allowedOrigins = [
        environment.yiiBackendUrl,
        'http://localhost:4200',
        'http://localhost',
    ];

    // Initial src for the iframe (set once, then we use location.replace)
    initialSrc: SafeResourceUrl = '';
    isLoading = true;
    hasError = false;
    errorMessage = '';
    iframeHeight = 0;

    constructor() {
        this.isBrowser = isPlatformBrowser(this.platformId);
    }

    ngOnInit(): void {
        this.setupMessageListener();
        this.setupRouterListener();

        // Set initial src based on current route
        const normalizedPath = this.normalizePath(this.router.url);
        const initialUrl = this.buildIframeUrl(normalizedPath);
        this.initialSrc =
            this.sanitizer.bypassSecurityTrustResourceUrl(initialUrl);
        this.currentIframePath = initialUrl;
    }

    /**
     * Build iframe URL with ?iframe=1 parameter for minimal layout
     */
    private buildIframeUrl(path: string): string {
        const basePath = path === '/' ? '/legacy/' : `/legacy${path}`;
        // Add iframe parameter for minimal Yii layout
        const separator = basePath.includes('?') ? '&' : '?';
        return `${basePath}${separator}iframe=1`;
    }

    ngAfterViewInit(): void {
        // Mark iframe as initialized after view is ready
        setTimeout(() => {
            this.iframeInitialized = true;
        }, 100);
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();

        if (this.isBrowser) {
            window.removeEventListener('message', this.handleMessage);
        }
    }

    /**
     * Navigate iframe using location.replace() to avoid history entries
     */
    private navigateIframe(path: string): void {
        if (!this.isBrowser || !this.iframeRef?.nativeElement) {
            this.logger.warn('[YiiIframe] Cannot navigate: iframe not ready');
            return;
        }

        const yiiUrl = this.buildIframeUrl(path);

        // Compare without iframe parameter for duplicate detection
        const currentBase = this.currentIframePath?.split('?')[0];
        const newBase = yiiUrl.split('?')[0];

        if (currentBase === newBase) {
            this.logger.info(
                '[YiiIframe] Same path, skipping navigation:',
                yiiUrl
            );
            return;
        }

        this.logger.info('[YiiIframe] Navigating iframe to:', yiiUrl);
        this.isLoading = true;
        this.hasError = false;
        this.currentIframePath = yiiUrl;

        try {
            const iframe = this.iframeRef.nativeElement;
            // Use location.replace() to avoid adding to browser history
            if (iframe.contentWindow) {
                iframe.contentWindow.location.replace(yiiUrl);
            } else {
                // Fallback: set src attribute
                iframe.src = yiiUrl;
            }
        } catch (e) {
            // Cross-origin error - use src attribute
            this.logger.warn(
                '[YiiIframe] Cross-origin, using src attribute:',
                e
            );
            this.iframeRef.nativeElement.src = yiiUrl;
        }
    }

    private setupMessageListener(): void {
        if (!this.isBrowser) {
            return;
        }

        window.addEventListener('message', this.handleMessage);
    }

    private handleMessage = (event: MessageEvent): void => {
        if (!this.allowedOrigins.includes(event.origin)) {
            return;
        }

        const message = event.data as YiiIframeMessage;
        if (!message?.type) {
            return;
        }

        switch (message.type) {
            case 'yii-iframe-loaded':
                this.handleIframeLoaded(message);
                break;
            case 'yii-iframe-navigate':
                this.handleIframeNavigate(message);
                break;
            case 'yii-iframe-height':
                this.handleIframeHeight(message);
                break;
            case 'yii-navigation':
                // Legacy message type for backward compatibility
                this.handleLegacyNavigation(message);
                break;
        }
    };

    private handleIframeLoaded(message: YiiIframeMessage): void {
        this.logger.info('[YiiIframe] Iframe loaded:', message.url, 'title:', message.title);
        this.isLoading = false;
        this.hasError = false;
        
        if (message.title) {
            this.titleChange.emit(message.title);
        }
        if (message.height) {
            this.iframeHeight = message.height;
            this.heightChange.emit(message.height);
        }
    }

    private handleIframeNavigate(message: YiiIframeMessage): void {
        if (!message.url) return;
        
        // Extract path from full URL
        let path: string;
        try {
            const url = new URL(message.url);
            path = url.pathname;
            // Remove .html suffix if present for Angular routing
            if (path.endsWith('.html')) {
                path = path.slice(0, -5);
            }
        } catch {
            path = message.originalHref || message.url;
        }

        const normalizedPath = this.normalizePath(path);
        this.logger.info('[YiiIframe] Navigation request from iframe:', normalizedPath);

        // Check if path already matches
        if (this.router.url === path || this.router.url === normalizedPath) {
            this.logger.info('[YiiIframe] Path already matches current URL, skipping');
            return;
        }

        this.pendingIframeNavigationPath = normalizedPath;

        // Navigate Angular router - this creates browser history
        void this.router.navigateByUrl(normalizedPath, {
            replaceUrl: false,
            skipLocationChange: false,
        });
    }

    private handleIframeHeight(message: YiiIframeMessage): void {
        if (message.height && message.height !== this.iframeHeight) {
            this.iframeHeight = message.height;
            this.heightChange.emit(message.height);
        }
    }

    private handleLegacyNavigation(message: YiiIframeMessage): void {
        const path = message.path;
        if (!path) return;
        
        const normalizedPath = this.normalizePath(path);
        this.logger.info('[YiiIframe] Legacy navigation event from iframe:', path);

        if (this.router.url === path || this.router.url === normalizedPath) {
            this.logger.info('[YiiIframe] Path already matches current URL, skipping navigation');
            return;
        }

        this.pendingIframeNavigationPath = normalizedPath;

        void this.router.navigateByUrl(path, {
            replaceUrl: false,
            skipLocationChange: false,
        });
    }

    private setupRouterListener(): void {
        this.router.events
            .pipe(
                filter(event => event instanceof NavigationEnd),
                takeUntil(this.destroy$)
            )
            .subscribe((event: NavigationEnd) => {
                const normalizedPath = this.normalizePath(
                    event.urlAfterRedirects
                );
                this.logger.info(
                    '[YiiIframe] Router navigation:',
                    normalizedPath,
                    'pending:',
                    this.pendingIframeNavigationPath
                );

                // Check if this navigation was triggered by iframe click
                const isFromIframe = this.pendingIframeNavigationPath &&
                    normalizedPath === this.pendingIframeNavigationPath;
                
                this.pendingIframeNavigationPath = null;

                // Navigate iframe (even if triggered from iframe - it needs to load the new page)
                if (this.iframeInitialized) {
                    this.navigateIframe(normalizedPath);
                }
                
                if (isFromIframe) {
                    this.logger.info('[YiiIframe] Navigation was triggered from iframe click');
                }
            });
    }

    onIframeLoad(): void {
        this.isLoading = false;
        this.hasError = false;
    }

    onIframeError(): void {
        this.isLoading = false;
        this.hasError = true;
        this.errorMessage = 'Failed to load Yii page. Please try again.';
    }

    reload(): void {
        if (this.iframeRef?.nativeElement) {
            const currentSrc = this.currentIframePath || '/legacy/?iframe=1';
            this.currentIframePath = null; // Force reload
            // Extract path without /legacy prefix and iframe parameter
            const path = currentSrc
                .replace('/legacy', '')
                .split('?')[0] || '/';
            this.navigateIframe(path);
        }
    }

    /**
     * Send message to iframe
     */
    sendMessageToIframe(action: string, data?: Record<string, unknown>): void {
        if (!this.isBrowser || !this.iframeRef?.nativeElement?.contentWindow) {
            return;
        }
        
        try {
            this.iframeRef.nativeElement.contentWindow.postMessage({
                type: 'angular-request',
                action,
                ...data
            }, '*');
        } catch (e) {
            this.logger.warn('[YiiIframe] Failed to send message to iframe:', e);
        }
    }

    /**
     * Request current height from iframe
     */
    requestHeight(): void {
        this.sendMessageToIframe('getHeight');
    }

    /**
     * Scroll iframe content to position
     */
    scrollIframeTo(position: number): void {
        this.sendMessageToIframe('scrollTo', { position });
    }

    private normalizePath(path: string): string {
        if (!path || path === '/') {
            return '/';
        }

        return path.startsWith('/') ? path : `/${path}`;
    }
}
