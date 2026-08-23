import { expect, test } from '../../fixtures';
import {
    getVersionNotification,
    getVersionNotificationPattern,
    getVersionUpdateButton,
} from '../../helpers/version-notification';
import { LayoutPage } from '../../pages/layout.page';
import { Page } from '@playwright/test';

/** Message VersionCheckService logs right after it stores the baseline version. */
const BASELINE_LOGGED = 'Initial version loaded';

const INITIAL_VERSION = { version: '1.0.0', buildTime: '2026-04-20T00:00:00Z', commit: 'abc' };
const UPDATED_VERSION = { version: '1.1.0', buildTime: '2026-04-20T01:00:00Z', commit: 'def' };

const setupInitialVersion = async (page: Page) => {
    await page.clock.install({ time: new Date('2026-04-20T12:00:00Z') });

    await page.route('**/version.json*', route => route.fulfill({ json: INITIAL_VERSION }));

    const layout = new LayoutPage(page);
    // VersionCheckService compares against a baseline it records only once the first
    // version.json has been consumed; until then the second poll finds `currentVersion`
    // undefined and returns without a notification, and the mocked clock never fires a
    // third one. Waiting for the response would only prove the headers arrived, so wait
    // for the log line the service writes on the statement after it stores the baseline.
    const baselineRecorded = page.waitForEvent('console', message => message.text().includes(BASELINE_LOGGED));
    await page.goto('/');
    await layout.waitForReady();
    await baselineRecorded;
};

const switchToUpdatedVersion = async (page: Page) => {
    await page.unroute('**/version.json*');
    await page.route('**/version.json*', route => route.fulfill({ json: UPDATED_VERSION }));

    await page.clock.fastForward(5 * 60 * 1000);
};

test.describe('Version update notification', () => {
    test('shows snackbar when version.json changes', async ({ authenticatedPage: page }) => {
        await setupInitialVersion(page);
        await switchToUpdatedVersion(page);

        await expect(getVersionNotification(page, '1.1.0')).toBeVisible({ timeout: 10000 });
        await expect(getVersionUpdateButton(page)).toBeVisible();
    });

    test('reloads page on snackbar action click', async ({ authenticatedPage: page }) => {
        await setupInitialVersion(page);
        await switchToUpdatedVersion(page);

        const notification = getVersionNotification(page, '1.1.0');
        await expect(notification).toBeVisible({ timeout: 10000 });

        await Promise.all([page.waitForEvent('load'), getVersionUpdateButton(page).click()]);

        await expect(notification).toHaveCount(0);
    });

    test('does not show snackbar when version is the same', async ({ authenticatedPage: page }) => {
        await setupInitialVersion(page);

        await page.clock.fastForward(5 * 60 * 1000);

        await expect(getVersionNotificationPattern(page)).toHaveCount(0);
    });
});
