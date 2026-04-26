import { Locator, Page } from '@playwright/test';

export type NotificationType = 'success' | 'error' | 'info';

/** Get a notification (snackbar) element, optionally filtered by type */
export function getNotification(page: Page, type?: NotificationType): Locator {
    const base = '.mat-mdc-snack-bar-container';
    const selector = type ? `${base}.toast-${type}` : base;
    return page.locator(selector);
}

/**
 * Start watching for a notification type via MutationObserver.
 * Call BEFORE the action that might trigger the notification.
 * Returns a function that resolves to `true` if the notification appeared at any point.
 */
export async function watchForNotification(
    page: Page,
    type: NotificationType,
): Promise<() => Promise<boolean>> {
    const selector = `.mat-mdc-snack-bar-container.toast-${type}`;
    const key = `__notificationWatch_${type}_${Date.now()}`;

    await page.evaluate(
        ({ sel, k }) => {
            const w = window as Record<string, unknown>;
            w[k] = false;
            const check = (): void => {
                if (document.querySelector(sel)) {
                    w[k] = true;
                }
            };
            check();
            const observer = new MutationObserver(() => check());
            observer.observe(document.body, { childList: true, subtree: true, attributes: true });
            w[`${k}_cleanup`] = () => observer.disconnect();
        },
        { sel: selector, k: key },
    );

    return async () => {
        return page.evaluate((k) => {
            const w = window as Record<string, unknown>;
            const cleanup = w[`${k}_cleanup`] as (() => void) | undefined;
            if (cleanup) cleanup();
            return w[k] as boolean;
        }, key);
    };
}
