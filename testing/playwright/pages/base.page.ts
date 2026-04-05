import { Page } from '@playwright/test';

export abstract class BasePage {
    constructor(protected readonly page: Page) {}

    /** Wait until the page is ready for interaction. Each Page Object defines its own readiness criteria. */
    abstract waitForReady(): Promise<void>;
}
