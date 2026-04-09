import { BasePage } from './base.page';

export class ArticlePage extends BasePage {
    readonly root = this.page.getByTestId('article-page');
    readonly error = this.page.getByTestId('article-error');
    readonly content = this.page.getByTestId('article-content');
    readonly stub = this.page.getByTestId('article-stub');
    readonly versionBanner = this.page.getByTestId('version-banner');
    readonly historyEmpty = this.page.getByTestId('history-empty');
    readonly historyError = this.page.getByTestId('history-error');

    readonly tabArticle = this.page.getByTestId('tab-article');
    readonly tabNews = this.page.getByTestId('tab-news');
    readonly tabForum = this.page.getByTestId('tab-forum');
    readonly tabHistory = this.page.getByTestId('tab-history');
    readonly tabLinkedhere = this.page.getByTestId('tab-linkedhere');

    async waitForReady(): Promise<void> {
        await this.root.waitFor({ state: 'visible' });
    }

    async waitForError(): Promise<void> {
        await this.error.waitFor({ state: 'visible' });
    }
}
