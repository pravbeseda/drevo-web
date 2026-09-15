import {
    test,
    expect,
    mockGlobalHistory,
    mockHistoryCounts,
    mockReviewsSummary,
    mockReviewsSummaryFeatureOff,
} from '../../fixtures';
import { getTooltip } from '../../helpers/tooltip';
import { createArticleHistoryItemDto, createArticleHistoryResponse, createReviewSummaryDto } from '../../mocks';
import { HistoryPage } from '../../pages/history.page';

const VOTED_TITLE = 'Статья с голосами';
const PLAIN_TITLE = 'Статья без ревью';
const VOTE_TITLE = 'Статья ждёт голос';

const historyItems = [
    createArticleHistoryItemDto({ versionId: 101, articleId: 42, title: VOTED_TITLE, approved: 0 }),
    createArticleHistoryItemDto({ versionId: 102, articleId: 42, title: PLAIN_TITLE }),
    createArticleHistoryItemDto({ versionId: 103, articleId: 42, title: VOTE_TITLE, approved: 0 }),
];

test.describe('History review badge', () => {
    test('shows a chip per verdict, marks the viewer vote and names each verdict voters in its tooltip', async ({
        authenticatedPage: page,
        isMobile,
    }) => {
        await mockHistoryCounts(page);
        await mockGlobalHistory(page, createArticleHistoryResponse(historyItems));
        await mockReviewsSummary(page, [
            createReviewSummaryDto({
                versionId: 101,
                status: 1,
                total: 3,
                needsMyVote: false,
                voters: { 1: ['Анна', 'Иван'], 3: ['Вера'] },
                myVote: 1,
            }),
        ]);

        const history = new HistoryPage(page);
        await history.gotoArticles();
        await history.waitForReady();

        const votedRow = history.historyItemByTitle(VOTED_TITLE);
        await expect(history.reviewBadgeChipTexts(votedRow)).toHaveText(['вы +1', '1']);

        const plainRow = history.historyItemByTitle(PLAIN_TITLE);
        await expect(history.reviewBadge(plainRow)).toHaveCount(0);

        test.skip(isMobile, 'Hover tooltips are not available on mobile');
        const chips = history.reviewBadgeChips(votedRow);
        await chips.nth(0).hover();
        await expect(getTooltip(page)).toHaveText('Одобряю: Анна, Иван');

        await page.mouse.move(0, 0);
        await expect(getTooltip(page)).toHaveCount(0);
        await chips.nth(1).hover();
        await expect(getTooltip(page)).toHaveText('Возражаю: Вера');
    });

    test('shows the "Нужен ваш голос" pill after the chips when the version awaits the user vote', async ({
        authenticatedPage: page,
    }) => {
        await mockHistoryCounts(page);
        await mockGlobalHistory(page, createArticleHistoryResponse(historyItems));
        await mockReviewsSummary(page, [
            createReviewSummaryDto({
                versionId: 103,
                status: 2,
                total: 1,
                needsMyVote: true,
                voters: { 2: ['Борис'] },
            }),
        ]);

        const history = new HistoryPage(page);
        await history.gotoArticles();
        await history.waitForReady();

        const voteRow = history.historyItemByTitle(VOTE_TITLE);
        await expect(history.reviewBadgeChipTexts(voteRow)).toHaveText(['1']);
        await expect(history.reviewBadgeVote(voteRow)).toHaveText('Нужен ваш голос');
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

        await expect(history.historyItemByTitle(VOTED_TITLE)).toBeVisible();
        await expect(page.getByTestId('review-badge')).toHaveCount(0);
        await expect(page.getByTestId('review-badge-vote')).toHaveCount(0);
    });
});
