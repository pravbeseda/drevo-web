import { Page } from '@playwright/test';

/** Get the notification (snackbar) element */
export function getNotification(page: Page) {
    return page.getByTestId('notification');
}
