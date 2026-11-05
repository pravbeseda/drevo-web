import { BasePage } from './base.page';
import { Locator } from '@playwright/test';

/** The news tab of an article: the news about it and the way to add one. */
export class ArticleNewsTabPage extends BasePage {
    readonly list = this.page.getByTestId('article-news-list');
    readonly items = this.page.getByTestId('article-news-item');
    readonly empty = this.page.getByTestId('article-news-empty');
    /** «Добавить новость» on the tab (desktop sidebar or mobile FAB). */
    readonly addNewsAction = this.sidebarAction('add-article-news-action');

    /** One news item of the list, by its title. */
    item(title: string): Locator {
        return this.items.filter({ hasText: title });
    }

    /** Scroll the list to its end, where the next page is asked for. */
    async scrollToEnd(): Promise<void> {
        await this.list.getByRole('list').evaluate(viewport => viewport.scrollTo({ top: viewport.scrollHeight }));
    }

    async waitForReady(): Promise<void> {
        await this.list.or(this.empty).waitFor({ state: 'visible' });
    }
}
