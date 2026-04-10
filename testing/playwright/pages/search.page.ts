import { BasePage } from './base.page';

export class SearchPage extends BasePage {
    readonly container = this.page.getByTestId('search-container');
    readonly searchInput = this.page.getByTestId('search-input').locator('input');
    readonly loading = this.page.getByTestId('search-loading');
    readonly results = this.page.getByTestId('search-results');
    readonly resultItems = this.page.getByTestId('search-result-item');
    readonly firstResult = this.resultItems.first();
    readonly noResults = this.page.getByTestId('search-no-results');

    async waitForReady(): Promise<void> {
        await this.container.waitFor({ state: 'visible' });
    }

    async typeQuery(query: string): Promise<void> {
        await this.searchInput.fill(query);
    }
}
