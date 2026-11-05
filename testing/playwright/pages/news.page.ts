import { BasePage } from './base.page';
import { Locator } from '@playwright/test';

/** A news item's page, its editor fields and its moderator's meta form. */
export class NewsPage extends BasePage {
    readonly root = this.page.getByTestId('news-page');
    readonly content = this.page.getByTestId('news-content');
    readonly date = this.page.getByTestId('news-date');
    readonly sections = this.page.getByTestId('news-section');
    readonly tabNewsItem = this.page.getByTestId('tab-news-item');
    readonly tabHistory = this.page.getByTestId('tab-history');
    readonly historyRows = this.page.locator('app-articles-history-item');
    /** The version link of each history row. */
    readonly historyRowLinks = this.historyRows.getByTestId('title');

    /** «Добавить новость» on the news tab of the history (desktop sidebar or mobile FAB). */
    readonly addNewsAction = this.sidebarAction('add-news-action');
    /** «Свойства новости», a moderator's action on a news item. */
    readonly metaAction = this.sidebarAction('news-meta-action');
    readonly titleInput = this.page.getByTestId('news-title-input').locator('input');
    readonly dateInput = this.page.getByTestId('news-date-input').locator('input');
    readonly metaSave = this.page.getByTestId('news-meta-save');

    /** A section to pick in the news fields, by its title. */
    topicOption(title: string): Locator {
        return this.page.getByTestId('news-topic-input').getByText(title, { exact: true });
    }

    /** A rank to pick in the meta form, by its label. */
    rankOption(label: string): Locator {
        return this.page.getByTestId('news-rank-input').getByText(label, { exact: true });
    }

    async waitForReady(): Promise<void> {
        await this.root.waitFor({ state: 'visible' });
    }
}
