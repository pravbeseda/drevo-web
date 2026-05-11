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
    readonly inworkHeader: Locator = this.page.getByTestId('history-inwork-header');
    readonly inworkItems: Locator = this.page.getByTestId('inwork-item');
    readonly inworkMarker: Locator = this.page.getByTestId('inwork-marker');
    readonly cancelInworkButton: Locator = this.page.getByTestId('cancel-inwork-button').getByRole('button');
    readonly confirmDialogConfirmButton: Locator = this.page.getByTestId('confirmation-dialog-confirm');
    readonly filtersButton: Locator = this.page.getByRole('button', { name: 'Фильтры' });
    readonly uncheckedFilter: Locator = this.page.getByTestId('filter-item').filter({ hasText: 'Непроверенные' });

    badgeFor(tab: Locator): Locator {
        return tab.locator('ui-badge');
    }

    async gotoArticles(): Promise<void> {
        await this.page.goto('/history/articles');
    }

    async selectUncheckedFilter(): Promise<void> {
        await this.filtersButton.click();
        await this.uncheckedFilter.click();
    }

    async cancelFirstOwnInworkItem(): Promise<void> {
        await this.cancelInworkButton.click();
        await this.confirmDialogConfirmButton.click();
    }

    async waitForReady(): Promise<void> {
        await Promise.race([
            this.historyList.waitFor({ state: 'visible' }),
            this.historyEmpty.waitFor({ state: 'visible' }),
            this.historyError.waitFor({ state: 'visible' }),
        ]);
    }
}
