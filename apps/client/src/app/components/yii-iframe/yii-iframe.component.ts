import {
    Component,
    OnInit,
    OnDestroy,
    inject,
    PLATFORM_ID,
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
export class YiiIframeComponent implements OnInit, OnDestroy {
    private readonly router = inject(Router);
    private readonly sanitizer = inject(DomSanitizer);
    private readonly platformId = inject(PLATFORM_ID);
    private readonly logger = inject(LoggerService);
    private readonly destroy$ = new Subject<void>();
    private readonly isBrowser: boolean;
    private pendingIframeNavigationPath: string | null = null;
    private readonly allowedOrigins = [
        environment.yiiBackendUrl,
        'http://localhost:4200',
        'http://localhost',
    ];

    iframeSrc: SafeResourceUrl | null = null;
    isLoading = true;
    hasError = false;
    errorMessage = '';

    constructor() {
        this.isBrowser = isPlatformBrowser(this.platformId);
    }

    ngOnInit(): void {
        this.updateIframeSrc();
        this.setupMessageListener();
        this.setupRouterListener();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();

        if (this.isBrowser) {
            window.removeEventListener('message', this.handleMessage);
        }
    }

    private updateIframeSrc(): void {
        const normalizedPath = this.normalizePath(this.router.url);

        if (
            this.pendingIframeNavigationPath &&
            normalizedPath === this.pendingIframeNavigationPath
        ) {
            this.logger.info(
                '[YiiIframe] Iframe already handled navigation, skipping src update'
            );
            this.pendingIframeNavigationPath = null;
            return;
        }

        this.pendingIframeNavigationPath = null;

        const yiiUrl =
            normalizedPath === '/' ? '/legacy/' : `/legacy${normalizedPath}`;

        this.logger.info('[YiiIframe] Updating iframe src:', yiiUrl);
        this.iframeSrc = this.sanitizer.bypassSecurityTrustResourceUrl(yiiUrl);
        this.isLoading = true;
        this.hasError = false;
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

        if (this.router.url === path) {
            this.logger.info(
                '[YiiIframe] Path already matches current URL, skipping navigation'
            );
            return;
        }

        this.pendingIframeNavigationPath = normalizedPath;
        this.isLoading = true;
        this.hasError = false;

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
            .subscribe(() => {
                this.logger.info(
                    '[YiiIframe] Router navigation detected, updating iframe'
                );
                this.updateIframeSrc();
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
        this.updateIframeSrc();
    }

    private normalizePath(path: string): string {
        if (!path || path === '/') {
            return '/';
        }

        return path.startsWith('/') ? path : `/${path}`;
    }
}
