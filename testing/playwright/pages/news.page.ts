import { BasePage } from './base.page';
import { Locator } from '@playwright/test';

/** A news item's page, its editor fields and its section picker. */
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
    readonly titleInput = this.page.getByTestId('news-title-input').locator('input');
    readonly dateInput = this.page.getByTestId('news-date-input').locator('input');

    /** «Раздел» in the sidebar, which opens the panel of sections. */
    readonly topicAction = this.sidebarAction('news-topic-action');
    readonly topicOk = this.page.getByTestId('news-topic-ok');
    /** «Содержание», which a news item does not offer. */
    readonly tableOfContentsAction = this.page.getByRole('button', { name: 'Содержание' });

    /** A section in the panel of sections, by its id. */
    topicCheckbox(id: number): Locator {
        return this.page.getByTestId(`news-topic-${id}`).locator('input');
    }

    async waitForReady(): Promise<void> {
        await this.root.waitFor({ state: 'visible' });
    }
}
