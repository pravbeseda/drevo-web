import { test, expect } from '../../fixtures';
import { LayoutPage } from '../../pages/layout.page';

// A render-blocking third-party resource holds back the `load` event that `page.goto` waits for,
// so a slow response from that host times tests out and delays the first paint for users.
test.describe('Third-party requests', () => {
    test('loads the app shell without requesting another host', async ({ authenticatedPage: page }) => {
        const requestedUrls: URL[] = [];
        page.on('request', request => requestedUrls.push(new URL(request.url())));

        await page.goto('/');
        await new LayoutPage(page).waitForReady();

        const appOrigin = new URL(page.url()).origin;
        const thirdPartyUrls = requestedUrls
            .filter(url => url.protocol.startsWith('http') && url.origin !== appOrigin)
            .map(url => url.href);
        expect(thirdPartyUrls).toEqual([]);
    });
});
