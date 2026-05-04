import { Locator, Page } from '@playwright/test';

export function getTooltip(page: Page): Locator {
    return page.locator('.mat-mdc-tooltip');
}
