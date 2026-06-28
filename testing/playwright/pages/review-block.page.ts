import { BasePage } from './base.page';
import { Locator } from '@playwright/test';

/**
 * Page Object for the shared `app-review-block` (people's review form). Used on
 * the version view and the diff page — exposes the vote form, status pills and
 * the collapsible comment field with its Save/Clear actions.
 */
export class ReviewBlockPage extends BasePage {
    readonly block: Locator = this.page.getByTestId('review-block');
    readonly form: Locator = this.page.getByTestId('review-form');
    readonly commentInput: Locator = this.page.getByTestId('review-comment-input');
    readonly saveButton: Locator = this.page.getByTestId('review-save');
    readonly clearButton: Locator = this.page.getByTestId('review-clear');

    /** A status pill by its numeric value (0 undecided, 1 approve, 2 suggest, 3 disagree). */
    status(value: number): Locator {
        return this.page.getByTestId(`toggle-${value}`);
    }

    /** Click a status pill, exactly as a user would. */
    async selectStatus(value: number): Promise<void> {
        await this.status(value).locator('button').click();
    }

    async waitForReady(): Promise<void> {
        await this.form.waitFor({ state: 'visible' });
    }
}
