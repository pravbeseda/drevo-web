import { Locator, Page } from '@playwright/test';

export function getConfirmationDialogTitle(page: Page): Locator {
    return page.getByTestId('confirmation-dialog-title');
}

export function getConfirmationDialogConfirm(page: Page): Locator {
    return page.getByTestId('confirmation-dialog-confirm');
}

export function getConfirmationDialogCancel(page: Page): Locator {
    return page.getByTestId('confirmation-dialog-cancel');
}
