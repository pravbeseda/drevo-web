import {
    test,
    expect,
    mockArticleModerate,
    mockArticleHistory,
    mockAuthApi,
    mockGlobalHistory,
    mockHistoryCounts,
    mockVersionPairs,
} from '../../fixtures';
import { createArticleHistoryItemDto, createArticleHistoryResponse, mockUsers } from '../../mocks';
import { createModerationResponseDto, createVersionPairsResponse } from '../../mocks/articles';
import { HistoryPage } from '../../pages/history.page';
import { ModerationSheetPage } from '../../pages/moderation-sheet.page';

const VERSION = 420;
const EARLIER_VERSION = 419;
const PENDING_TITLE = 'Статья на проверке';
const CANCELLED_TITLE = 'Отменённая статья';

const historyItems = [
    createArticleHistoryItemDto({ versionId: 421, articleId: 43, title: CANCELLED_TITLE, approved: -2 }),
    createArticleHistoryItemDto({ versionId: VERSION, articleId: 42, title: PENDING_TITLE, approved: 0 }),
    createArticleHistoryItemDto({ versionId: EARLIER_VERSION, articleId: 42, title: PENDING_TITLE, approved: 0 }),
];

test.describe('History moderation', () => {
    let history: HistoryPage;

    test.beforeEach(async ({ authenticatedPage: page }) => {
        await mockHistoryCounts(page);
        await mockGlobalHistory(page, createArticleHistoryResponse(historyItems));
        history = new HistoryPage(page);
    });

    test('a regular user sees the status icon only', async () => {
        await history.gotoArticles();
        await history.waitForReady();

        const row = history.historyItemByTitle(PENDING_TITLE).first();
        await expect(history.statusIcon(row)).toBeVisible();
        await expect(history.moderateButton(row)).toHaveCount(0);
    });

    test('an admin can moderate from the status icon', async ({ authenticatedPage: page }) => {
        await mockAuthApi(page, mockUsers.admin);
        await history.gotoArticles();
        await history.waitForReady();

        await expect(history.moderateButton(history.historyItemByTitle(PENDING_TITLE).first())).toBeVisible();
    });

    test('a moderator approves a version from its status icon', async ({ authenticatedPage: page }) => {
        await mockAuthApi(page, mockUsers.moderator);
        await mockVersionPairs(
            page,
            VERSION,
            createVersionPairsResponse({ versionId: VERSION, content: 'Новый текст.' }, { content: 'Старый текст.' }),
        );
        await mockArticleModerate(page, createModerationResponseDto({ versionId: VERSION, approved: 1 }));
        // The backend approves the article's earlier pending versions along with this one.
        await mockArticleHistory(
            page,
            42,
            createArticleHistoryResponse([
                createArticleHistoryItemDto({ versionId: VERSION, articleId: 42, title: PENDING_TITLE, approved: 1 }),
                createArticleHistoryItemDto({
                    versionId: EARLIER_VERSION,
                    articleId: 42,
                    title: PENDING_TITLE,
                    approved: 1,
                }),
            ]),
        );
        const sheet = new ModerationSheetPage(page);
        await history.gotoArticles();
        await history.waitForReady();
        const [row, earlierRow] = [0, 1].map(index => history.historyItemByTitle(PENDING_TITLE).nth(index));

        await expect(history.moderateButton(history.historyItemByTitle(CANCELLED_TITLE))).toHaveCount(0);

        await history.moderateButton(row).click();
        await sheet.waitForReady();
        await sheet.approveButton.click();

        await expect(sheet.approveButton).toBeHidden();
        await expect(history.statusIcon(row)).toHaveClass(/approved/);
        await expect(history.statusIcon(earlierRow)).toHaveClass(/approved/);
    });
});
