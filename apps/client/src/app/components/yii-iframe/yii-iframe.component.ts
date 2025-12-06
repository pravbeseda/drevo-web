import {
    Component,
    OnInit,
    OnDestroy,
    AfterViewInit,
    inject,
    PLATFORM_ID,
    ViewChild,
    ElementRef,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { LoggerService } from '../../services/logger/logger.service';

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

    constructor() {
        this.isBrowser = isPlatformBrowser(this.platformId);
    }

    ngOnInit(): void {
        this.setupMessageListener();
        this.setupRouterListener();

        // Set initial src based on current route
        const normalizedPath = this.normalizePath(this.router.url);
        const initialUrl =
            normalizedPath === '/' ? '/legacy/' : `/legacy${normalizedPath}`;
        this.initialSrc =
            this.sanitizer.bypassSecurityTrustResourceUrl(initialUrl);
        this.currentIframePath = initialUrl;
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

        const yiiUrl = path === '/' ? '/legacy/' : `/legacy${path}`;

        if (this.currentIframePath === yiiUrl) {
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

        if (event.data?.type !== 'yii-navigation') {
            return;
        }

        const path = event.data.path;
        const normalizedPath = this.normalizePath(path);
        this.logger.info('[YiiIframe] Navigation event from iframe:', path);

        // Check if path already matches
        if (this.router.url === path || this.router.url === normalizedPath) {
            this.logger.info(
                '[YiiIframe] Path already matches current URL, skipping navigation'
            );
            return;
        }

        this.pendingIframeNavigationPath = normalizedPath;

        // Navigate Angular router - this creates browser history
        void this.router.navigateByUrl(path, {
            replaceUrl: false,
            skipLocationChange: false,
        });
    };

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

                // Skip if this navigation was triggered by iframe message
                if (
                    this.pendingIframeNavigationPath &&
                    normalizedPath === this.pendingIframeNavigationPath
                ) {
                    this.logger.info(
                        '[YiiIframe] Navigation from iframe, skipping iframe update'
                    );
                    this.pendingIframeNavigationPath = null;
                    // Update current path tracking
                    this.currentIframePath =
                        normalizedPath === '/'
                            ? '/legacy/'
                            : `/legacy${normalizedPath}`;
                    return;
                }

                this.pendingIframeNavigationPath = null;

                // Navigate iframe
                if (this.iframeInitialized) {
                    this.navigateIframe(normalizedPath);
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
            const currentSrc = this.currentIframePath || '/legacy/';
            this.currentIframePath = null; // Force reload
            this.navigateIframe(
                currentSrc.replace('/legacy', '') || '/'
            );
        }
    }

    private normalizePath(path: string): string {
        if (!path || path === '/') {
            return '/';
        }

        return path.startsWith('/') ? path : `/${path}`;
    }
}
