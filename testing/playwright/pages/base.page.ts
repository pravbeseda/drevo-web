import { Locator, Page } from '@playwright/test';

export abstract class BasePage {
    constructor(protected readonly page: Page) {}

    /** Wait until the page is ready for interaction. Each Page Object defines its own readiness criteria. */
    abstract waitForReady(): Promise<void>;

    /**
     * Locate a visible action button by its parent data-testid.
     * Use for sidebar action elements that appear in both desktop sidebar and mobile FAB
     * (only one is visible at any viewport width). Targets the actual button/link inside
     * the `ui-action-button` host (which has `display: contents` and is invisible to Playwright).
     */
    protected sidebarAction(testId: string): Locator {
        return this.page.locator(`[data-testid="${testId}"] .action-button:visible`);
    }

    /**
     * Open the mobile speed-dial menu if present. No-op on desktop.
     * Call before interacting with secondary sidebar actions on mobile.
     */
    async openMobileMenu(): Promise<void> {
        const menuToggle = this.page.locator('[data-testid="fab-menu-toggle"] .action-button:visible');
        if (await menuToggle.isVisible()) {
            const isOpen = await this.page.locator('.speed-dial.open').isVisible().catch(() => false);
            if (!isOpen) {
                await menuToggle.click();
                await this.page.locator('.speed-dial.open').waitFor({ state: 'visible' });
            }
        }
    }
}
