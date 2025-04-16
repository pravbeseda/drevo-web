import { test, expect } from '@playwright/test';

test('has editor', async ({ page }) => {
    await page.goto('/new/article/edit/1');

    const content = 'Test article content';

    await page.evaluate(
        ([content]) => {
            const event = new MessageEvent('message', {
                data: { article: { content } },
            });
            Object.defineProperty(event, 'origin', { value: 'http://drevo-local.ru' });
            window.dispatchEvent(event);
        },
        [content]
    );

    expect(await page.locator('app-article-edit').count()).toBe(1);
    // await expect(page.locator('app-article-edit')).toHaveText(content, {
    //     timeout: 5000,
    // });
});
