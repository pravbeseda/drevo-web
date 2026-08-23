import { Locator, Page } from '@playwright/test';

export function getConfirmationDialogTitle(page: Page): Locator {
    return page.getByTestId('confirmation-dialog-title');
}
