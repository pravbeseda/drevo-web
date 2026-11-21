import { test, expect, mockAuthApi, mockGlobalHistory } from '../../fixtures';
import { createArticleHistoryItemDto, createArticleHistoryResponse, mockUsers } from '../../mocks';
import { HistoryPage } from '../../pages/history.page';
import { Page } from '@playwright/test';

async function openHistory(page: Page): Promise<HistoryPage> {
    await mockGlobalHistory(
        page,
        createArticleHistoryResponse([
            createArticleHistoryItemDto(
                { title: 'Правка на модерации', approved: 0, addedChars: 1840, removedChars: 112 },
                1,
            ),
            createArticleHistoryItemDto({ title: 'Подтверждённая правка', approved: 1 }, 2),
        ]),
    );
    await page.goto('/history/articles');
    const history = new HistoryPage(page);
    await history.waitForReady();
    return history;
}

test.describe('History edit size', () => {
    test('a moderator sees the characters a pending edit added and removed, and none on an approved row', async ({
        page,
    }) => {
        await mockAuthApi(page, mockUsers.moderator);
        const history = await openHistory(page);

        const pending = history.historyItemByTitle('Правка на модерации');
        await expect(history.editSizeAdded(pending)).toHaveText('+1 840');
        await expect(history.editSizeRemoved(pending)).toHaveText('−112');
        await expect(history.editSize(history.historyItemByTitle('Подтверждённая правка'))).toBeHidden();
    });

    test('a user who cannot moderate sees no edit size', async ({ authenticatedPage: page }) => {
        const history = await openHistory(page);

        const pending = history.historyItemByTitle('Правка на модерации');
        await expect(pending).toBeVisible();
        await expect(history.editSize(pending)).toBeHidden();
    });
});
