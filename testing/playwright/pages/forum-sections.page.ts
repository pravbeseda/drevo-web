import { BasePage } from './base.page';
import { Locator } from '@playwright/test';

export class ForumSectionsPage extends BasePage {
    readonly items = this.page.getByTestId('section-item');
    readonly loadError = this.page.getByTestId('sections-load-error');

    /** The list is the first thing the resolved data puts on screen. */
    async waitForReady(): Promise<void> {
        await this.items.first().waitFor({ state: 'visible' });
    }

    link(name: string): Locator {
        return this.page.getByTestId('section-link').filter({ hasText: name });
    }

    async open(name: string): Promise<void> {
        await this.link(name).click();
    }
}
