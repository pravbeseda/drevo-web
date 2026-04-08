import { test, expect } from '../../fixtures';
import { LayoutPage } from '../../pages/layout.page';

const DRAWER_KEY = 'drevo-sidebar-open';

test.describe('Sidebar', () => {
    let layout: LayoutPage;

    test.describe('Navigation', () => {
        test.beforeEach(async ({ authenticatedPage: page, isMobile }) => {
            layout = new LayoutPage(page);
            await page.goto('/');
            await layout.waitForReady();
            // On mobile the sidebar is a closed drawer by default; open it first
            if (isMobile) {
                await layout.hamburgerButton.click();
                await layout.expectSidebarExpanded();
            }
        });

        test('renders nav links', async () => {
            const count = await layout.navItems.count();
            expect(count).toBeGreaterThan(0);
        });

        test('navigates to pictures on link click', async ({ authenticatedPage: page }) => {
            await layout.navItem('Иллюстрации').click();
            await expect(page).toHaveURL('/pictures');
        });
    });

    test.describe('Collapsed / Expanded', () => {
        // These tests describe desktop sidebar behaviour. On mobile the sidebar
        // is a drawer that always starts closed — skip those projects.
        test.beforeEach(async ({ isMobile }) => {
            test.skip(isMobile, 'On mobile the sidebar is a drawer that starts closed');
        });

        test.beforeEach(async ({ authenticatedPage: page }) => {
            layout = new LayoutPage(page);
            await page.goto('/');
            await layout.waitForReady();
        });

        test('starts expanded by default (no localStorage)', async () => {
            await layout.expectSidebarExpanded();
        });

        test('collapses on hamburger click', async () => {
            await layout.hamburgerButton.click();
            await layout.expectSidebarCollapsed();
        });

        test('expands after second hamburger click', async () => {
            await layout.hamburgerButton.click();
            await layout.expectSidebarCollapsed();
            await layout.hamburgerButton.click();
            await layout.expectSidebarExpanded();
        });
    });

    test.describe('State persistence', () => {
        test('restores expanded state from localStorage', async ({ authenticatedPage: page, isMobile }) => {
            // On mobile, LayoutComponent always calls drawerService.close() on init,
            // ignoring localStorage — skip mobile.
            test.skip(isMobile, 'Mobile layout ignores localStorage for sidebar state');

            await page.addInitScript((key) => {
                localStorage.setItem(key, 'true');
            }, DRAWER_KEY);
            layout = new LayoutPage(page);
            await page.goto('/');
            await layout.waitForReady();

            await layout.expectSidebarExpanded();
        });

        test('restores collapsed state from localStorage', async ({ authenticatedPage: page, isMobile }) => {
            test.skip(isMobile, 'Mobile layout ignores localStorage for sidebar state');

            await page.addInitScript((key) => {
                localStorage.setItem(key, 'false');
            }, DRAWER_KEY);
            layout = new LayoutPage(page);
            await page.goto('/');
            await layout.waitForReady();

            await layout.expectSidebarCollapsed();
        });

        test('saves collapsed state to localStorage after toggle', async ({ authenticatedPage: page, isMobile }) => {
            // On desktop: sidebar starts open, toggle collapses it → saves 'false'.
            // On mobile: sidebar starts closed, toggle opens it → saves 'true'. Skip mobile.
            test.skip(isMobile, 'On mobile toggle opens an already-closed drawer');

            layout = new LayoutPage(page);
            await page.goto('/');
            await layout.waitForReady();

            await layout.hamburgerButton.click();
            // DrawerService.toggle() saves synchronously
            const value = await page.evaluate(key => localStorage.getItem(key), DRAWER_KEY);
            expect(value).toBe('false');
        });
    });
});
