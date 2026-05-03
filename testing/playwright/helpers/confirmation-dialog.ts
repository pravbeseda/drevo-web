import { Locator, Page } from '@playwright/test';

export function getConfirmationDialog(page: Page) {
    return {
        title: page.getByTestId('confirmation-dialog-title'),
        message: page.getByTestId('confirmation-dialog-message'),
    };
}

export function getConfirmationDialogTitle(page: Page): Locator {
    return page.getByTestId('confirmation-dialog-title');
}
