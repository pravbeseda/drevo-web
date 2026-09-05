import { BasePage } from './base.page';
import { Locator } from '@playwright/test';

/** The section tabs the forum wraps its topic lists in. */
export class ForumTabsPage extends BasePage {
    readonly tabs = this.page.getByTestId(/^forum-tab-/);
    readonly allTopics = this.page.getByTestId('forum-tab-all');

    /** The «all topics» tab is there before the sections resolve, so it is what tells the shell is up. */
    async waitForReady(): Promise<void> {
        await this.allTopics.waitFor({ state: 'visible' });
    }

    tab(sectionId: string): Locator {
        return this.page.getByTestId(`forum-tab-${sectionId}`);
    }

    async open(sectionId: string): Promise<void> {
        await this.tab(sectionId).click();
    }
}
