import { BasePage } from './base.page';

export class LinkedHereTabPage extends BasePage {
    readonly container = this.page.getByTestId('linkedhere-container');
    readonly searchInput = this.page.getByTestId('linkedhere-search').locator('input, textarea');
    readonly count = this.page.getByTestId('linkedhere-count');
    readonly items = this.page.getByTestId('linkedhere-item');
    readonly empty = this.page.getByTestId('linkedhere-empty');
    readonly noResults = this.page.getByTestId('linkedhere-no-results');

    async waitForReady(): Promise<void> {
        await this.container.waitFor({ state: 'visible' });
    }

    async filter(value: string): Promise<void> {
        await this.searchInput.fill(value);
    }
}
