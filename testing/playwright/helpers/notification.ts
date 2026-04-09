import { Locator, Page } from '@playwright/test';

export type NotificationType = 'success' | 'error' | 'info';

/** Get a notification (snackbar) element, optionally filtered by type */
export function getNotification(page: Page, type?: NotificationType): Locator {
    const base = '.mat-mdc-snack-bar-container';
    const selector = type ? `${base}.toast-${type}` : base;
    return page.locator(selector);
}
