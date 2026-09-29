import { BasePage } from './base.page';
import { Locator } from '@playwright/test';

export class ForumNewTopicPage extends BasePage {
    /** The button above a topic list — of a forum section or of an article's discussions. */
    readonly start: Locator = this.page.getByTestId('forum-new-topic');
    readonly section = this.page.getByTestId('new-topic-section');
    readonly owner = this.page.getByTestId('new-topic-owner');
    readonly title = this.page.getByTestId('new-topic-title').locator('input');
    readonly text = this.page.getByTestId('new-topic-text').locator('.cm-content');
    readonly editor = this.page.getByTestId('new-topic-text');
    readonly submit = this.sidebarAction('new-topic-submit');
    readonly cancel = this.sidebarAction('new-topic-cancel');
    readonly discard = this.page.getByTestId('confirmation-dialog-confirm');
    readonly titleError = this.page.getByTestId('new-topic-title-error');
    readonly pending = this.page.getByTestId('new-topic-pending');

    async waitForReady(): Promise<void> {
        await this.title.waitFor({ state: 'visible' });
    }

    async fill(title: string, text: string): Promise<void> {
        await this.title.fill(title);
        await this.text.click();
        await this.page.keyboard.type(text);
    }

    async pickSection(name: string): Promise<void> {
        await this.section.getByText(name).click();
    }

    /** The toggle of one section, by its id. */
    sectionOption(id: string): Locator {
        return this.section.getByTestId(`toggle-${id}`);
    }
}
