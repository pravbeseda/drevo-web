import { BasePage } from './base.page';
import { Locator } from '@playwright/test';

/** The section filter at the end of the forum list's toolbar. */
export class ForumFilterPage extends BasePage {
    readonly button = this.page.getByTestId('forum-filter-button');
    /** The name of the section the list is narrowed to; absent on every topic. */
    readonly current = this.page.getByTestId('forum-filter-current');

    /** The button renders once the sections have resolved. */
    async waitForReady(): Promise<void> {
        await this.button.waitFor({ state: 'visible' });
    }

    /** A menu item: a section by its id, or every topic without one. */
    option(sectionId?: string): Locator {
        return this.page.getByTestId(sectionId ? `forum-filter-${sectionId}` : 'forum-filter-all');
    }

    async pick(sectionId?: string): Promise<void> {
        await this.button.click();
        await this.option(sectionId).click();
    }
}
