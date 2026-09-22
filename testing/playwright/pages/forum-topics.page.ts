import { BasePage } from './base.page';
import { Locator } from '@playwright/test';

export class ForumTopicsPage extends BasePage {
    readonly items = this.page.getByTestId('topic-item');
    readonly empty = this.page.getByTestId('topics-empty');
    readonly notFound = this.page.getByTestId('topics-not-found');

    /** A topic row is the first thing the resolved section puts on screen. */
    async waitForReady(): Promise<void> {
        await this.items.first().waitFor({ state: 'visible' });
    }

    title(text: string): Locator {
        return this.page.getByTestId('topic-title').filter({ hasText: text });
    }

    /** The row's link, found by the topic it opens. */
    link(text: string): Locator {
        return this.page.getByTestId('topic-link').filter({ has: this.title(text) });
    }

    article(text: string): Locator {
        return this.link(text).getByTestId('topic-article');
    }

    async open(text: string): Promise<void> {
        await this.title(text).click();
    }
}
