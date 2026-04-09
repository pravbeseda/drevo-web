import { BasePage } from './base.page';

export class MainPage extends BasePage {
    readonly root = this.page.getByTestId('main-page');
    readonly loading = this.page.getByTestId('main-loading');
    readonly articleList = this.page.getByTestId('main-article-list');
    readonly articles = this.page.getByTestId('main-article');
    readonly empty = this.page.getByTestId('main-empty');
    readonly error = this.page.getByTestId('main-error');

    async waitForReady(): Promise<void> {
        await this.root.waitFor({ state: 'visible' });
    }

    async waitForArticles(): Promise<void> {
        await this.articleList.waitFor({ state: 'visible' });
        await this.articles.first().waitFor({ state: 'visible' });
    }

    async waitForEmpty(): Promise<void> {
        await this.empty.waitFor({ state: 'visible' });
    }

    async waitForError(): Promise<void> {
        await this.error.waitFor({ state: 'visible' });
    }

    async clickFirstArticle(): Promise<void> {
        await this.articles.first().click();
    }
}
