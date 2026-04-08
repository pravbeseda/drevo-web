import { BasePage } from './base.page';
import { expect } from '@playwright/test';

export class LayoutPage extends BasePage {
    // Header
    readonly header = this.page.getByTestId('header');
    readonly pageTitle = this.page.getByTestId('page-title');
    readonly hamburgerButton = this.page.getByTestId('hamburger-button');

    // Account dropdown
    readonly accountButton = this.page.getByTestId('account-button');
    readonly userName = this.page.getByTestId('user-name');
    readonly logoutButton = this.page.getByTestId('logout-button');

    // Theme toggle
    readonly themeToggle = this.page.getByTestId('theme-toggle');

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

    /** Assert sidebar is expanded (retries until true or timeout). */
    async expectSidebarExpanded(): Promise<void> {
        await expect(this.page.locator('.layout')).not.toHaveClass(/sidebar-collapsed/);
    }

    /** Assert sidebar is collapsed (retries until true or timeout). */
    async expectSidebarCollapsed(): Promise<void> {
        await expect(this.page.locator('.layout')).toHaveClass(/sidebar-collapsed/);
    }

    /** Open the account dropdown menu */
    async openAccountMenu(): Promise<void> {
        await this.accountButton.click();
    }

    /** Open account dropdown and click logout */
    async clickLogout(): Promise<void> {
        await this.openAccountMenu();
        await this.logoutButton.click();
    }

    /** Open the font-scale popup */
    async openFontScalePopup(): Promise<void> {
        await this.fontScaleToggle.click();
        await this.fontScalePopup.waitFor({ state: 'visible' });
    }

    /** Close the font-scale popup by clicking the backdrop */
    async closeFontScalePopup(): Promise<void> {
        await this.page.locator('.font-scale-backdrop').click({ force: true });
        await this.fontScalePopup.waitFor({ state: 'hidden' });
    }
}
