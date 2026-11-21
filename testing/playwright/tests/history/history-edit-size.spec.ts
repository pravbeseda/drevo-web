import { test, expect, mockGlobalHistory } from '../../fixtures';
import { createArticleHistoryItemDto, createArticleHistoryResponse } from '../../mocks';
import { HistoryPage } from '../../pages/history.page';

test.describe('History edit size', () => {
    test('a pending row shows the characters its edit added and removed, an approved row shows none', async ({
        authenticatedPage: page,
    }) => {
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

        const pending = history.historyItemByTitle('Правка на модерации');
        await expect(history.editSizeAdded(pending)).toHaveText('+1 840');
        await expect(history.editSizeRemoved(pending)).toHaveText('−112');
        await expect(history.editSize(history.historyItemByTitle('Подтверждённая правка'))).toBeHidden();
    });
});
