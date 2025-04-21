import { test, expect } from '@playwright/test';

test('has editor', async ({ page }) => {
    await page.goto('/new/editor');

    const content = 'Test article content';

    await page.evaluate(
        ([content]) => {
            const event = new MessageEvent('message', {
                data: { article: { content } },
            });
            Object.defineProperty(event, 'origin', {
                value: 'http://drevo-local.ru',
            });
            window.dispatchEvent(event);
        },
        [content]
    );

    await expect(page.locator('app-shared-editor')).toHaveCount(1, {
        timeout: 10_000,
    });
    // await expect(page.locator('app-article-edit')).toHaveText(content, {
    //     timeout: 5000,
    // });
});
