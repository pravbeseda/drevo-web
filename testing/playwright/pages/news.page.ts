import { BasePage } from './base.page';
import { Locator } from '@playwright/test';

/** The news feed and a news item's page. */
export class NewsPage extends BasePage {
    readonly feedList = this.page.getByTestId('news-feed-list');
    readonly feedItems = this.page.getByTestId('news-feed-item');
    readonly feedEmpty = this.page.getByTestId('news-feed-empty');
    readonly filterButton = this.page.getByTestId('news-filter-button');
    readonly filterCurrent = this.page.getByTestId('news-filter-current');

    readonly root = this.page.getByTestId('news-page');
    readonly content = this.page.getByTestId('news-content');
    readonly date = this.page.getByTestId('news-date');
    readonly sections = this.page.getByTestId('news-section');
    readonly tabNewsItem = this.page.getByTestId('tab-news-item');
    readonly tabHistory = this.page.getByTestId('tab-history');
    readonly historyRows = this.page.locator('app-articles-history-item');
    /** The version link of each history row. */
    readonly historyRowLinks = this.historyRows.getByTestId('title');

    /** One news item of the feed, by its title. */
    feedItem(title: string): Locator {
        return this.feedItems.filter({ hasText: title });
    }

    /** One section of the filter menu, by its id; `all` for every section. */
    filterOption(id: number | 'all'): Locator {
        return this.page.getByTestId(`news-filter-${id}`);
    }

    async waitForReady(): Promise<void> {
        await this.feedList.or(this.root).first().waitFor({ state: 'visible' });
    }
}
