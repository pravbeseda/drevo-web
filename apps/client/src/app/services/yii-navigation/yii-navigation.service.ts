import { Injectable } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { LoggerService } from '../logger/logger.service';

@Injectable({
    providedIn: 'root',
})
export class YiiNavigationService {
    // List of known Angular routes (extensible)
    private readonly angularRoutes: string[] = ['/editor'];

    constructor(
        private router: Router,
        private logger: LoggerService
    ) {
        this.setupNavigationTracking();
    }

    isAngularRoute(path: string): boolean {
        // Remove query params and hash for comparison
        const cleanPath = path.split('?')[0].split('#')[0];

        return this.angularRoutes.some(route => {
            if (cleanPath === route) {
                return true;
            }

            // Route with parameters (starts with route/)
            return cleanPath.startsWith(route + '/') && route !== '/';
        });
    }

    getYiiUrl(path: string): string {
        // Remove leading slash if present
        const cleanPath = path.startsWith('/') ? path.slice(1) : path;
        return `/legacy/${cleanPath}`;
    }

    registerAngularRoute(route: string): void {
        if (!this.angularRoutes.includes(route)) {
            this.angularRoutes.push(route);
            this.logger.log(
                `[YiiNavigation] Registered new Angular route: ${route}`
            );
        }
    }

    getAngularRoutes(): string[] {
        return [...this.angularRoutes];
    }

    private setupNavigationTracking(): void {
        this.router.events
            .pipe(filter(event => event instanceof NavigationEnd))
            .subscribe((event: NavigationEnd) => {
                const isAngular = this.isAngularRoute(event.urlAfterRedirects);
                this.logger.log(
                    `[YiiNavigation] Navigation to: ${event.urlAfterRedirects} | ` +
                        `Type: ${isAngular ? 'Angular' : 'Yii iframe'}`
                );
            });
    }

    /**
     * Handle postMessage from Yii iframe for navigation sync
     * Call this from window message event listener
     */
    handleIframeNavigation(path: string): void {
        this.logger.log(`[YiiNavigation] Iframe navigation request: ${path}`);

        // Update browser URL without reloading the page
        this.router.navigate([path], {
            replaceUrl: false,
            skipLocationChange: false,
        });
    }

    /**
     * Send message to Yii iframe (for future bidirectional communication)
     */
    sendMessageToIframe(message: unknown): void {
        const iframe = document.querySelector(
            'iframe.yii-iframe'
        ) as HTMLIFrameElement;
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage(message, window.location.origin);
        }
    }
}
