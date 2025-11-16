import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
    providedIn: 'root',
})
export class YiiNavigationService {
    // List of known Angular routes (extensible)
    private readonly angularRoutes: string[] = ['/editor'];

    constructor(private router: Router) {}

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
        }
    }

    getAngularRoutes(): string[] {
        return [...this.angularRoutes];
    }

    /**
     * Handle postMessage from Yii iframe for navigation sync
     * Call this from window message event listener
     */
    handleIframeNavigation(path: string): void {
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
