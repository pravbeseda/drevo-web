import { BasePage } from './base.page';
import { Locator } from '@playwright/test';

export class DiffPage extends BasePage {
    readonly error: Locator = this.page.getByTestId('diff-error');
    readonly meta: Locator = this.page.getByTestId('diff-meta');
    readonly toggleButton: Locator = this.sidebarAction('diff-toggle');

    async waitForReady(): Promise<void> {
        await Promise.race([this.meta.waitFor({ state: 'visible' }), this.error.waitFor({ state: 'visible' })]);
    }
}
