import {
    test,
    expect,
    mockGlobalHistory,
    mockHistoryCounts,
    mockReviewsSummary,
    mockReviewsSummaryFeatureOff,
} from '../../fixtures';
import { createArticleHistoryItemDto, createArticleHistoryResponse, createReviewSummaryDto } from '../../mocks';
import { HistoryPage } from '../../pages/history.page';

const APPROVED_TITLE = 'Статья с одобрением';
const PLAIN_TITLE = 'Статья без ревью';
const VOTE_TITLE = 'Статья ждёт голос';

const historyItems = [
    createArticleHistoryItemDto({ versionId: 101, articleId: 42, title: APPROVED_TITLE, approved: 0 }),
    createArticleHistoryItemDto({ versionId: 102, articleId: 42, title: PLAIN_TITLE }),
    createArticleHistoryItemDto({ versionId: 103, articleId: 42, title: VOTE_TITLE, approved: 0 }),
];

test.describe('History review badge', () => {
    test('shows a verdict pill with counter only on rows that have a summary', async ({ authenticatedPage: page }) => {
        await mockHistoryCounts(page);
        await mockGlobalHistory(page, createArticleHistoryResponse(historyItems));
        await mockReviewsSummary(page, [
            createReviewSummaryDto({ versionId: 101, status: 1, total: 4, needsMyVote: false }),
        ]);

        const history = new HistoryPage(page);
        await history.gotoArticles();
        await history.waitForReady();

        const approvedRow = history.historyItemByTitle(APPROVED_TITLE);
        await expect(history.reviewBadge(approvedRow)).toBeVisible();
        await expect(history.reviewBadgeLabel(approvedRow)).toHaveText('Одобрено');
        await expect(history.reviewBadgeCount(approvedRow)).toContainText('4');

        const plainRow = history.historyItemByTitle(PLAIN_TITLE);
        await expect(history.reviewBadge(plainRow)).toHaveCount(0);
        await expect(history.reviewBadgeVote(plainRow)).toHaveCount(0);
    });

    test('shows the blue "Нужен ваш голос" pill when the version awaits the user vote', async ({
        authenticatedPage: page,
    }) => {
        await mockHistoryCounts(page);
        await mockGlobalHistory(page, createArticleHistoryResponse(historyItems));
        await mockReviewsSummary(page, [
            createReviewSummaryDto({ versionId: 103, status: 2, total: 3, needsMyVote: true }),
        ]);

        const history = new HistoryPage(page);
        await history.gotoArticles();
        await history.waitForReady();

        const voteRow = history.historyItemByTitle(VOTE_TITLE);
        await expect(history.reviewBadgeVote(voteRow)).toBeVisible();
        await expect(history.reviewBadgeVote(voteRow)).toHaveText('Нужен ваш голос');
        await expect(history.reviewBadge(voteRow)).toHaveCount(0);
    });

    test('renders the list without badges when the review feature is disabled (404)', async ({
        authenticatedPage: page,
    }) => {
        await mockHistoryCounts(page);
        await mockGlobalHistory(page, createArticleHistoryResponse(historyItems));
        await mockReviewsSummaryFeatureOff(page);

        const history = new HistoryPage(page);
        await history.gotoArticles();
        await history.waitForReady();

        await expect(history.historyItemByTitle(APPROVED_TITLE)).toBeVisible();
        await expect(page.getByTestId('review-badge')).toHaveCount(0);
        await expect(page.getByTestId('review-badge-vote')).toHaveCount(0);
    });
});
