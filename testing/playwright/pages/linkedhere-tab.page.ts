import { BasePage } from './base.page';

export class LinkedHereTabPage extends BasePage {
    readonly container = this.page.getByTestId('linkedhere-container');
    readonly searchInput = this.page.getByTestId('linkedhere-search').locator('input, textarea');
    readonly count = this.page.getByTestId('linkedhere-count');
    readonly items = this.page.getByTestId('linkedhere-item');
    /** Search-match highlights the backend wraps in `<mark>` inside the item titles */
    readonly highlights = this.items.locator('mark');
    readonly empty = this.page.getByTestId('linkedhere-empty');
    readonly noResults = this.page.getByTestId('linkedhere-no-results');
    readonly scroller = this.page.getByTestId('linkedhere-scroller');

    async waitForReady(): Promise<void> {
        await this.container.waitFor({ state: 'visible' });
    }

    /** Scrolls the list to its end, as far as the rows loaded so far reach. */
    async scrollToEnd(): Promise<void> {
        await this.scroller.evaluate(scroller => scroller.scrollTo({ top: scroller.scrollHeight }));
    }

    async filter(value: string): Promise<void> {
        await this.searchInput.fill(value);
    }
}
