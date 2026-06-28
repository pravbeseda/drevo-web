import { test, expect, mockVersionPairs, mockReviewsList, mockAuthApi, bypassSsr } from '../../fixtures';
import { createVersionPairsResponse, mockUsers } from '../../mocks';
import { ApprovalStatus, ReviewStatus } from '@drevo-web/shared';
import { Page } from '@playwright/test';
import { ReviewBlockPage } from '../../pages/review-block.page';

const VERSION = 200;
const DIFF_URL = `/history/articles/diff/${VERSION}`;
const DIFF_URL_PATTERN = '**/history/articles/diff/**';

/**
 * Open the diff page as an eligible reviewer on a pending version with no
 * existing votes, so the review form is shown and the comment field starts
 * collapsed. Client-side rendering (bypassSsr) keeps the mocked API in the
 * browser where `page.route` applies.
 */
async function openReviewForm(page: Page): Promise<ReviewBlockPage> {
    await bypassSsr(page, DIFF_URL_PATTERN);
    await mockAuthApi(page, mockUsers.reviewer);
    await mockReviewsList(page, []);
    await mockVersionPairs(page, VERSION, createVersionPairsResponse({ approved: ApprovalStatus.Pending }));

    const review = new ReviewBlockPage(page);
    await page.goto(DIFF_URL);
    await review.waitForReady();
    return review;
}

test.describe('Review block — comment field visibility', () => {
    test('hides the comment field and its actions by default', async ({ authenticatedPage: page }) => {
        const review = await openReviewForm(page);

        await expect(review.form).toBeVisible();
        await expect(review.commentInput).toBeHidden();
        await expect(review.saveButton).toBeHidden();
    });

    test('reveals the comment field when a status is selected', async ({ authenticatedPage: page }) => {
        const review = await openReviewForm(page);

        await review.selectStatus(ReviewStatus.Suggest);

        await expect(review.commentInput).toBeVisible();
        await expect(review.saveButton).toBeVisible();
    });

    test('collapses on re-click of the active status when there is nothing to save', async ({
        authenticatedPage: page,
    }) => {
        const review = await openReviewForm(page);

        // First click on the already-selected default status opens the field.
        await review.selectStatus(ReviewStatus.Undecided);
        await expect(review.commentInput).toBeVisible();

        // Re-click with no pending changes toggles it back closed.
        await review.selectStatus(ReviewStatus.Undecided);
        await expect(review.commentInput).toBeHidden();
    });

    test('disables save when the status is changed away and back to the saved value', async ({
        authenticatedPage: page,
    }) => {
        const review = await openReviewForm(page);

        await review.selectStatus(ReviewStatus.Approve);
        await expect(review.saveButton).toBeEnabled();

        // Returning to the original status matches the saved baseline again.
        await review.selectStatus(ReviewStatus.Undecided);
        await expect(review.saveButton).toBeDisabled();
    });
});
