import { Page } from '@playwright/test';

export function getReloadPrompt(page: Page) {
    const overlay = page.getByTestId('reload-prompt');
    return {
        overlay,
        host: page.locator('app-reload-prompt'),
        reloadButton: page.getByTestId('reload-button'),
    };
}
