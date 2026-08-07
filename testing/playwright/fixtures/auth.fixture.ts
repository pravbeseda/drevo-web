import { test as coverageTest } from './coverage.fixture';
import { mockAuthApi, mockUnauthenticatedApi } from './mock-api.fixture';
import { Page } from '@playwright/test';

export interface AuthFixtures {
    /** Page with mocked authenticated user state */
    authenticatedPage: Page;
    /** Page with mocked unauthenticated user state */
    unauthenticatedPage: Page;
}

export const test = coverageTest.extend<AuthFixtures>({
    authenticatedPage: async ({ page }, use) => {
        await mockAuthApi(page);
        await use(page);
    },

    unauthenticatedPage: async ({ page }, use) => {
        await mockUnauthenticatedApi(page);
        await use(page);
    },
});
