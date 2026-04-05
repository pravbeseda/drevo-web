import { Page } from '@playwright/test';

export abstract class BasePage {
    constructor(protected readonly page: Page) {}

    /** Wait for the loading spinner to disappear */
    async waitForLoaded(): Promise<void> {
        await this.page
            .getByTestId('spinner')
            .waitFor({ state: 'hidden', timeout: 5000 })
            .catch(() => {
                /* spinner may not appear for fast loads */
            });
    }
}
