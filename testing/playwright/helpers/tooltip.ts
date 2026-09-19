import { Locator, Page } from '@playwright/test';

export function getTooltip(page: Page): Locator {
    return page.locator('.mat-mdc-tooltip');
}

/** The tooltip's text surface — the element carrying the multiline styling. */
export function getTooltipSurface(page: Page): Locator {
    return getTooltip(page).locator('.mdc-tooltip__surface');
}

/** Move the pointer to the page corner so an open hover tooltip closes. */
export async function dismissTooltip(page: Page): Promise<void> {
    await page.mouse.move(0, 0);
}
