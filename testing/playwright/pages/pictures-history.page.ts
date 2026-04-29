import { BasePage } from './base.page';

export class PicturesHistoryPage extends BasePage {
    readonly picturesList = this.page.getByTestId('pictures-list');
    readonly recentEmpty = this.page.getByTestId('recent-empty');
    readonly recentError = this.page.getByTestId('recent-error');
    readonly pendingError = this.page.getByTestId('pending-error');

    readonly pendingCards = this.page.getByTestId('pending-card');
    readonly pendingCardTitles = this.page.getByTestId('pending-card-title');
    readonly pendingItemTypes = this.page.getByTestId('pending-item-type');
    readonly pendingItemAuthors = this.page.getByTestId('pending-item-author');

    readonly recentItems = this.page.getByTestId('recent-item');
    readonly recentItemTitles = this.page.getByTestId('recent-item-title');

    async waitForReady(): Promise<void> {
        await Promise.race([
            this.picturesList.waitFor({ state: 'visible' }),
            this.recentEmpty.waitFor({ state: 'visible' }),
            this.recentError.waitFor({ state: 'visible' }),
        ]);
    }
}
