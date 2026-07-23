import { BasePage } from './base.page';

/** Placeholder page shown at /articles/find/:title when the article does not exist */
export class ArticleFindPage extends BasePage {
    readonly root = this.page.getByTestId('article-missing');
    readonly createButton = this.page.getByTestId('create-article-action');
    readonly deniedReason = this.page.getByTestId('create-article-denied');

    readonly tabArticle = this.page.getByTestId('tab-article');
    readonly tabHistory = this.page.getByTestId('tab-history');
    readonly tabLinkedhere = this.page.getByTestId('tab-linkedhere');

    async waitForReady(): Promise<void> {
        await this.root.waitFor({ state: 'visible' });
    }

    async clickCreate(): Promise<void> {
        await this.createButton.click();
    }

    async openLinkedHere(): Promise<void> {
        await this.tabLinkedhere.click();
    }
}
