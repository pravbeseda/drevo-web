import { BasePage } from './base.page';
import { Page } from '@playwright/test';

export class ArticlePage extends BasePage {
    readonly root = this.page.getByTestId('article-page');
    readonly error = this.page.getByTestId('article-error');
    readonly content = this.page.getByTestId('article-content');

    // Article content is legacy HTML injected via innerHTML — it cannot carry
    // `data-testid`. The `.pic` class is the structural marker the app itself
    // keys off (`closest('.pic')` in ArticleContentComponent), so it is a stable
    // selector here despite the usual data-testid convention.
    /** Image rendered inside legacy `.pic` markup in the article content */
    readonly pictureImage = this.content.locator('.pic img');
    /** Link wrapping the picture inside `.pic` markup */
    readonly pictureLink = this.content.locator('.pic a');
    readonly stub = this.page.getByTestId('article-stub');
    readonly versionBanner = this.page.getByTestId('version-banner');
    readonly historyEmpty = this.page.getByTestId('history-empty');
    readonly historyError = this.page.getByTestId('history-error');

    readonly tabArticle = this.page.getByTestId('tab-article');
    readonly tabNews = this.page.getByTestId('tab-news');
    readonly tabForum = this.page.getByTestId('tab-forum');
    readonly tabHistory = this.page.getByTestId('tab-history');
    readonly tabLinkedhere = this.page.getByTestId('tab-linkedhere');

    /** Moderation sidebar action button (desktop sidebar or mobile FAB, visible for moderators only) */
    readonly moderationAction = this.sidebarAction('moderation-action');
    /** Approve button inside the moderation panel */
    readonly moderationApproveButton = this.page.getByTestId('moderation-approve-button');
    /** Send to review button inside the moderation panel */
    readonly moderationReviewButton = this.page.getByTestId('moderation-review-button');
    /** Reject button inside the moderation panel */
    readonly moderationRejectButton = this.page.getByTestId('moderation-reject-button');

    async waitForReady(): Promise<void> {
        await this.root.waitFor({ state: 'visible' });
    }

    async waitForError(): Promise<void> {
        await this.error.waitFor({ state: 'visible' });
    }

    /** Left-click the article picture — expected to open the lightbox */
    async clickPicture(): Promise<void> {
        await this.pictureImage.click();
    }

    /** Middle-click the article picture link — returns the page opened in the new tab */
    async openPictureInNewTab(): Promise<Page> {
        const newPagePromise = this.page.context().waitForEvent('page');
        await this.pictureLink.click({ button: 'middle' });
        const newPage = await newPagePromise;
        await newPage.waitForLoadState();
        return newPage;
    }
}
