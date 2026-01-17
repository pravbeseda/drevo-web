import { InjectionToken, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Injection token for the browser's Window object.
 *
 * Returns the actual window object in browser environment,
 * or undefined in SSR/Node.js environment.
 *
 * @example
 * ```typescript
 * private readonly window = inject(WINDOW);
 *
 * if (this.window) {
 *     this.window.addEventListener('storage', handler);
 * }
 * ```
 */
export const WINDOW = new InjectionToken<Window | undefined>('WindowToken', {
    providedIn: 'root',
    factory: () => {
        const platformId = inject(PLATFORM_ID);
        return isPlatformBrowser(platformId) ? window : undefined;
    },
});
