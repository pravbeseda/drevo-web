import { BasePage } from './base.page';
import { Locator } from '@playwright/test';

export class HistoryPage extends BasePage {
    readonly tabArticles: Locator = this.page.getByTestId('history-tab-articles');
    readonly tabNews: Locator = this.page.getByTestId('history-tab-news');
    readonly tabForum: Locator = this.page.getByTestId('history-tab-forum');
    readonly tabPictures: Locator = this.page.getByTestId('history-tab-pictures');
    readonly historyList: Locator = this.page.getByTestId('history-list');
    readonly historyEmpty: Locator = this.page.getByTestId('history-empty');
    readonly historyError: Locator = this.page.getByTestId('history-error');

    badgeFor(tab: Locator): Locator {
        return tab.locator('ui-badge');
    }

    async waitForReady(): Promise<void> {
        await Promise.race([
            this.historyList.waitFor({ state: 'visible' }),
            this.historyEmpty.waitFor({ state: 'visible' }),
            this.historyError.waitFor({ state: 'visible' }),
        ]);
    }
}
