import { test, expect } from './fixtures';

/**
 * Example test demonstrating editor functionality.
 *
 * Uses authenticatedPage fixture since the editor route
 * requires authentication.
 */
test('has editor', async ({ authenticatedPage: page }) => {
    await page.goto('/editor');

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
});
