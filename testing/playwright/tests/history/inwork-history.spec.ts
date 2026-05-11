import { test, expect, mockGlobalHistory, mockInworkList, mockInworkClear } from '../../fixtures';
import { createArticleHistoryItemDto, createArticleHistoryResponse, createInworkItemDto, mockUsers } from '../../mocks';
import { HistoryPage } from '../../pages/history.page';

test.describe('Inwork history section', () => {
    test('shows inwork section on all filter', async ({ authenticatedPage: page }) => {
        await mockGlobalHistory(page, createArticleHistoryResponse([createArticleHistoryItemDto({ versionId: 10 })]));
        await mockInworkList(page, [
            createInworkItemDto({ id: 10, title: 'Редактируемая статья', author: mockUsers.authenticated.name }, 10),
            createInworkItemDto({ id: 0, title: 'Новая статья', author: 'Другой автор' }, 11),
        ]);

        const history = new HistoryPage(page);
        await history.gotoArticles();
        await history.waitForReady();

        await expect(history.inworkHeader).toBeVisible();
        await expect(history.inworkItems).toHaveCount(2);
    });

    test('hides inwork section after selecting another filter', async ({ authenticatedPage: page }) => {
        await mockGlobalHistory(page, createArticleHistoryResponse([createArticleHistoryItemDto({ versionId: 10 })]));
        await mockInworkList(page, [createInworkItemDto({ id: 10, title: 'Редактируемая статья' })]);

        const history = new HistoryPage(page);
        await history.gotoArticles();
        await history.waitForReady();
        await expect(history.inworkHeader).toBeVisible();

        await history.selectUncheckedFilter();

        await expect(history.inworkHeader).toBeHidden();
    });

    test('removes own inwork item after cancel confirmation', async ({ authenticatedPage: page }) => {
        await mockGlobalHistory(page, createArticleHistoryResponse([createArticleHistoryItemDto({ versionId: 10 })]));
        await mockInworkList(page, [
            createInworkItemDto({ id: 10, title: 'Моя статья', author: mockUsers.authenticated.name }),
        ]);
        await mockInworkClear(page);

        const history = new HistoryPage(page);
        await history.gotoArticles();
        await history.waitForReady();

        await history.cancelFirstOwnInworkItem();

        await expect(history.inworkItems).toHaveCount(0);
    });

    test('marks history version when matching inwork item exists', async ({ authenticatedPage: page }) => {
        await mockGlobalHistory(page, createArticleHistoryResponse([createArticleHistoryItemDto({ versionId: 10 })]));
        await mockInworkList(page, [createInworkItemDto({ id: 10, title: 'Редактируемая статья' })]);

        const history = new HistoryPage(page);
        await history.gotoArticles();
        await history.waitForReady();

        await expect(history.inworkMarker).toBeVisible();
    });
});
