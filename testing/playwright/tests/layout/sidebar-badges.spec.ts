import type { Locator } from '@playwright/test';
import { test, expect, mockAuthApi, mockForumUnreadCount, mockGlobalHistory, mockHistoryCounts } from '../../fixtures';
import { mockUsers } from '../../mocks';
import { LayoutPage } from '../../pages/layout.page';

/** WCAG 2.1 SC 1.4.11, the minimum for a non-text mark against what surrounds it. */
const MIN_BADGE_CONTRAST = 3;

function backgroundOf(locator: Locator): Promise<string> {
    return locator.evaluate(element => getComputedStyle(element).backgroundColor);
}

function luminance(color: string): number {
    const channels = (color.match(/[\d.]+/g) ?? []).slice(0, 3).map(value => {
        const channel = Number(value) / 255;
        return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

async function contrastBetween(first: Locator, second: Locator): Promise<number> {
    const [a, b] = [luminance(await backgroundOf(first)), luminance(await backgroundOf(second))];
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

test.describe('Sidebar badges', () => {
    test('moderator sees the pending total and the unread messages', async ({ page, isMobile }) => {
        await mockAuthApi(page, mockUsers.moderator);
        await mockHistoryCounts(page, { pendingArticles: 5, pendingNews: 2, pendingPictures: 3 });
        await mockForumUnreadCount(page, 7);

        await page.goto('/');
        const layout = new LayoutPage(page);
        await layout.waitForAuthReady();
        await layout.openSidebarOnMobile(isMobile);

        await expect(layout.navBadge('Изменения')).toHaveText('10');
        await expect(layout.navBadge('Форум')).toHaveText('7');
        await expect(layout.navBadge('Иллюстрации')).toBeHidden();
    });

    test('regular user sees the unread messages but not the moderation queue', async ({
        authenticatedPage: page,
        isMobile,
    }) => {
        await mockHistoryCounts(page, { pendingArticles: 5, pendingNews: 2, pendingPictures: 3 });
        await mockForumUnreadCount(page, 7);

        await page.goto('/');
        const layout = new LayoutPage(page);
        await layout.waitForAuthReady();
        await layout.openSidebarOnMobile(isMobile);

        await expect(layout.navBadge('Форум')).toHaveText('7');
        await expect(layout.navBadge('Изменения')).toBeHidden();
    });

    test('a count past the cap is shortened', async ({ authenticatedPage: page, isMobile }) => {
        await mockForumUnreadCount(page, 1234);

        await page.goto('/');
        const layout = new LayoutPage(page);
        await layout.waitForAuthReady();
        await layout.openSidebarOnMobile(isMobile);

        await expect(layout.navBadge('Форум')).toHaveText('99+');
    });

    test('the badge stands out from a hovered item', async ({ authenticatedPage: page, isMobile }) => {
        test.skip(isMobile, 'A phone has no hover');
        await mockForumUnreadCount(page, 7);

        await page.goto('/');
        const layout = new LayoutPage(page);
        await layout.waitForAuthReady();
        const item = layout.navItem('Форум');
        const badge = layout.navBadge('Форум');
        await badge.waitFor({ state: 'visible' });
        const idle = await backgroundOf(item);

        await item.hover();

        await expect.poll(() => backgroundOf(item)).not.toBe(idle);
        await expect.poll(() => contrastBetween(item, badge)).toBeGreaterThanOrEqual(MIN_BADGE_CONTRAST);
    });

    test('the badge stands out from the active item', async ({ page, isMobile }) => {
        await mockAuthApi(page, mockUsers.moderator);
        await mockGlobalHistory(page);
        await mockHistoryCounts(page, { pendingArticles: 34, pendingNews: 0, pendingPictures: 0 });

        await page.goto('/history/articles');
        const layout = new LayoutPage(page);
        await layout.waitForAuthReady();
        await layout.openSidebarOnMobile(isMobile);
        const item = layout.navItem('Изменения');
        const badge = layout.navBadge('Изменения');
        await badge.waitFor({ state: 'visible' });

        await expect(item).toHaveClass(/active/);
        await expect.poll(() => contrastBetween(item, badge)).toBeGreaterThanOrEqual(MIN_BADGE_CONTRAST);
    });

    test('the badge stays on the icon when the sidebar is collapsed', async ({ authenticatedPage: page, isMobile }) => {
        test.skip(isMobile, 'On mobile the sidebar is a drawer that starts closed');
        await mockForumUnreadCount(page, 7);

        await page.goto('/');
        const layout = new LayoutPage(page);
        await layout.waitForAuthReady();
        await layout.hamburgerButton.click();
        await layout.expectSidebarCollapsed();

        await expect(layout.navBadge('Форум')).toBeVisible();
    });
});
