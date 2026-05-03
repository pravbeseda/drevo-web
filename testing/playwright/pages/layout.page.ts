import { BasePage } from './base.page';
import { expect } from '@playwright/test';

export class LayoutPage extends BasePage {
    // Header
    readonly header = this.page.getByTestId('header');
    readonly pageTitle = this.page.getByTestId('page-title');
    readonly hamburgerButton = this.page.getByTestId('hamburger-button');

    // Search
    readonly searchButton = this.page.getByTestId('search-button');

    // Account dropdown
    readonly accountButton = this.page.getByTestId('account-button');
    readonly userName = this.page.getByTestId('user-name');
    readonly userRole = this.page.getByTestId('user-role');
    readonly logoutButton = this.page.getByTestId('logout-button');
    readonly downloadLogsButton = this.page.getByTestId('download-logs-button');

    // Theme toggle
    readonly themeToggle = this.page.getByTestId('theme-toggle');
    readonly htmlElement = this.page.locator('html');

    // Font scale — component host elements (for clicks)
    readonly fontScaleToggle = this.page.getByTestId('font-scale-toggle');
    readonly fontScalePopup = this.page.getByTestId('font-scale-popup');
    readonly fontScaleValue = this.page.getByTestId('font-scale-value');
    readonly fontScaleDecrease = this.page.getByTestId('font-scale-decrease');
    readonly fontScaleIncrease = this.page.getByTestId('font-scale-increase');
    readonly fontScaleReset = this.page.getByTestId('font-scale-reset');

    // Font scale — inner <button> elements for toBeDisabled() checks.
    // ui-icon-button / ui-button render a native <button> inside; the host
    // component element is not a form element so Playwright's toBeDisabled()
    // must target the inner <button>.
    readonly fontScaleDecreaseButton = this.page.getByTestId('font-scale-decrease').locator('button');
    readonly fontScaleIncreaseButton = this.page.getByTestId('font-scale-increase').locator('button');
    readonly fontScaleResetButton = this.page.getByTestId('font-scale-reset').locator('button');

    // Sidebar
    readonly sidebar = this.page.getByTestId('sidebar');
    readonly navItems = this.sidebar.getByTestId('nav-item');

    async waitForReady(): Promise<void> {
        await this.header.waitFor({ state: 'visible' });
    }

    /** Get a nav item by its aria-label */
    navItem(label: string) {
        return this.sidebar.locator(`[data-testid="nav-item"][aria-label="${label}"]`);
    }

    private readonly layoutRoot = this.page.locator('.layout');
    private readonly fontScaleBackdrop = this.page.locator('.font-scale-backdrop');

    /** Assert sidebar is expanded (retries until true or timeout). */
    async expectSidebarExpanded(): Promise<void> {
        await expect(this.layoutRoot).not.toHaveClass(/sidebar-collapsed/);
    }

    /** Assert sidebar is collapsed (retries until true or timeout). */
    async expectSidebarCollapsed(): Promise<void> {
        await expect(this.layoutRoot).toHaveClass(/sidebar-collapsed/);
    }

    async expectDarkTheme(): Promise<void> {
        await expect(this.htmlElement).toHaveClass(/dark-theme/);
    }

    async expectLightTheme(): Promise<void> {
        await expect(this.htmlElement).not.toHaveClass(/dark-theme/);
        await expect(this.htmlElement).toHaveClass(/light-theme/);
    }

    /** Open the account dropdown menu */
    async openAccountMenu(): Promise<void> {
        await this.accountButton.click();
    }

    /** Close the account dropdown via Escape key */
    async closeAccountMenu(): Promise<void> {
        await this.page.keyboard.press('Escape');
    }

    /** Open account dropdown and click logout */
    async clickLogout(): Promise<void> {
        await this.openAccountMenu();
        await this.logoutButton.click();
    }

    /** Click the search icon to open the search modal */
    async openSearch(): Promise<void> {
        await this.searchButton.click();
        await this.page.getByTestId('search-container').waitFor({ state: 'visible' });
    }

    /** Open the font-scale popup */
    async openFontScalePopup(): Promise<void> {
        await this.fontScaleToggle.click();
        await this.fontScalePopup.waitFor({ state: 'visible' });
    }

    /** Close the font-scale popup by clicking the backdrop */
    async closeFontScalePopup(): Promise<void> {
        await this.fontScaleBackdrop.click({ force: true });
        await this.fontScalePopup.waitFor({ state: 'hidden' });
    }
}
