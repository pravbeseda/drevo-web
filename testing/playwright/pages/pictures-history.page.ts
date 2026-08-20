import { BasePage } from './base.page';
import { expect } from '@playwright/test';

export class PicturesHistoryPage extends BasePage {
    readonly picturesList = this.page.getByTestId('pictures-list');
    readonly recentEmpty = this.page.getByTestId('recent-empty');
    readonly recentError = this.page.getByTestId('recent-error');
    readonly pendingError = this.page.getByTestId('pending-error');

    readonly pendingCards = this.page.getByTestId('pending-card');
    readonly pendingCardTitles = this.page.getByTestId('pending-card-title');
    readonly pendingItemTypes = this.page.getByTestId('pending-item-type');
    readonly pendingItemAuthors = this.page.getByTestId('pending-item-author');

    readonly recentItems = this.page.getByTestId('recent-item');
    readonly recentItemTitles = this.page.getByTestId('recent-item-title');

    private readonly pendingCardNoThumbnails = this.page.getByTestId('pending-card-no-thumbnail');
    private readonly pendingItemDeleteButtons = this.page.getByTestId('pending-item-delete');

    /** Assert the first card stands for a deleted picture: fallback title, no thumbnail. */
    async expectDeletedPictureCard(title: string): Promise<void> {
        await expect(this.pendingCardTitles.first()).toHaveText(title);
        await expect(this.pendingCardNoThumbnails).toHaveCount(1);
    }

    /** Assert how many pending items offer removal (retries until true or timeout). */
    async expectDeleteButtonCount(count: number): Promise<void> {
        await expect(this.pendingItemDeleteButtons).toHaveCount(count);
    }

    /** Assert how many pending cards are on the page (retries until true or timeout). */
    async expectPendingCardCount(count: number): Promise<void> {
        await expect(this.pendingCards).toHaveCount(count);
    }

    /** Assert the page fell through to its empty state (retries until true or timeout). */
    async expectEmptyState(): Promise<void> {
        await expect(this.recentEmpty).toBeVisible();
    }

    /** Assert no card stands for a deleted picture. */
    async expectNoDeletedPictureCard(): Promise<void> {
        await expect(this.pendingCardNoThumbnails).toHaveCount(0);
    }

    async deleteFirstPending(): Promise<void> {
        await this.pendingItemDeleteButtons.first().click();
    }

    async waitForReady(): Promise<void> {
        await Promise.race([
            this.picturesList.waitFor({ state: 'visible' }),
            this.recentEmpty.waitFor({ state: 'visible' }),
            this.recentError.waitFor({ state: 'visible' }),
        ]);
    }
}
