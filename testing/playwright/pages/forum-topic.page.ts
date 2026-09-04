import { BasePage } from './base.page';
import { Locator } from '@playwright/test';

export class ForumTopicPage extends BasePage {
    readonly title = this.page.getByTestId('topic-page-title');
    readonly author = this.page.getByTestId('topic-author');
    readonly notFound = this.page.getByTestId('topic-not-found');
    readonly loadError = this.page.getByTestId('topic-load-error');

    /** The heading carries the resolved topic, so it is absent until the data is. */
    async waitForReady(): Promise<void> {
        await this.title.waitFor({ state: 'visible' });
    }

    /** A message card names the message rather than its position in the list. */
    message(id: number): Locator {
        return this.page.getByTestId(`message-${id}`);
    }

    /** What the highlight actually paints — a token that resolves to nothing would match the plain card. */
    messageBackground(id: number): Promise<string> {
        return this.message(id).evaluate(element => getComputedStyle(element).backgroundColor);
    }
}
