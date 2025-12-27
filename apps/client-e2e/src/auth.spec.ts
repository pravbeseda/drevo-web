import { test, expect, Page } from '@playwright/test';

// Timeouts
const DEFAULT_WAIT_TIMEOUT = 10000;

// Page Object Selectors
const poForm = 'form';
const poUsernameInput = 'input[type="text"], input[formcontrolname="username"]';
const poPasswordInput = 'input[type="password"]';
const poSubmitButton = 'button[type="submit"]';
const poCheckbox = 'input[type="checkbox"]';
const poAuthStatus = 'app-auth-status';
const poLoginLink = 'a[href="/login"], a:has-text("Войти")';
const poLogoutButton = 'button:has-text("Выйти")';
const poErrorMessage =
    '.error, [class*="error"], [class*="alert"], [role="alert"]';

// Test Data
const TEST_INVALID_CREDENTIALS = {
    username: 'invaliduser',
    password: 'invalidpassword',
};
const TEST_FORM_DATA = {
    username: 'testuser',
    password: 'testpassword',
};

// Helper functions
async function fillLoginForm(
    page: Page,
    username: string,
    password: string
): Promise<void> {
    await page.locator(poUsernameInput).first().fill(username);
    await page.locator(poPasswordInput).fill(password);
}

async function waitForLoginForm(page: Page): Promise<void> {
    await expect(page.locator(poForm)).toBeVisible({
        timeout: DEFAULT_WAIT_TIMEOUT,
    });
}

/**
 * E2E Tests for Authentication UI (Task 4.1)
 *
 * Tests the frontend authentication flow:
 * - Login page functionality
 * - Auth status component states
 * - Login/logout user flows
 *
 * Note: These tests require the backend to be running at drevo-local.ru
 * They are skipped in CI (no backend available)
 */

test.describe('Authentication UI', () => {
    test.describe('Login Page', () => {
        test.beforeEach(async ({ page }) => {
            await page.goto('/login');
            await waitForLoginForm(page);
        });

        test('should display login form with all elements', async ({
            page,
        }) => {
            await expect(page.locator(poUsernameInput)).toBeVisible();
            await expect(page.locator(poPasswordInput)).toBeVisible();
            await expect(page.locator(poSubmitButton)).toBeVisible();
            await expect(page.locator(poCheckbox)).toBeVisible();
        });

        test('should disable submit button when form is empty', async ({
            page,
        }) => {
            await expect(page.locator(poSubmitButton)).toBeDisabled();
        });

        test('should enable submit button when form is filled', async ({
            page,
        }) => {
            await fillLoginForm(
                page,
                TEST_FORM_DATA.username,
                TEST_FORM_DATA.password
            );
            await expect(page.locator(poSubmitButton)).toBeEnabled();
        });

        test('should keep submit disabled with empty username', async ({
            page,
        }) => {
            // Focus and blur username field to trigger validation
            const usernameInput = page.locator(poUsernameInput).first();
            await usernameInput.focus();
            await usernameInput.blur();

            // Fill only password
            await page.locator(poPasswordInput).fill(TEST_FORM_DATA.password);

            await expect(page.locator(poSubmitButton)).toBeDisabled();
        });

        test('should show error message for invalid credentials', async ({
            page,
        }) => {
            await fillLoginForm(
                page,
                TEST_INVALID_CREDENTIALS.username,
                TEST_INVALID_CREDENTIALS.password
            );
            await page.locator(poSubmitButton).click();

            await expect(page.locator(poErrorMessage).first()).toBeVisible({
                timeout: DEFAULT_WAIT_TIMEOUT,
            });
        });
    });

    test.describe('Auth Status Component', () => {
        test.beforeEach(async ({ page }) => {
            await page.context().clearCookies();
        });

        test('should show login link for unauthenticated user', async ({
            page,
        }) => {
            await page.goto('/');

            await expect(page.locator(poAuthStatus)).toBeVisible({
                timeout: DEFAULT_WAIT_TIMEOUT,
            });
            await expect(page.locator(poLoginLink)).toBeVisible({
                timeout: DEFAULT_WAIT_TIMEOUT,
            });
        });
    });

    test.describe('Login Flow', () => {
        // These tests require real backend with valid test credentials
        // To run: set TEST_USERNAME and TEST_PASSWORD environment variables

        test('should redirect to home after successful login', async ({
            page,
        }) => {
            test.skip(
                !process.env['TEST_USERNAME'] || !process.env['TEST_PASSWORD'],
                'Requires TEST_USERNAME and TEST_PASSWORD environment variables'
            );

            await page.goto('/login');
            await waitForLoginForm(page);

            await fillLoginForm(
                page,
                process.env['TEST_USERNAME']!,
                process.env['TEST_PASSWORD']!
            );
            await page.locator(poSubmitButton).click();

            await page.waitForURL(url => !url.pathname.includes('/login'), {
                timeout: DEFAULT_WAIT_TIMEOUT,
            });
        });
    });

    test.describe('Logout Flow', () => {
        test('should show login link after logout', async ({ page }) => {
            test.skip(
                !process.env['TEST_USERNAME'] || !process.env['TEST_PASSWORD'],
                'Requires TEST_USERNAME and TEST_PASSWORD environment variables'
            );

            // First login
            await page.goto('/login');
            await waitForLoginForm(page);
            await fillLoginForm(
                page,
                process.env['TEST_USERNAME']!,
                process.env['TEST_PASSWORD']!
            );
            await page.locator(poSubmitButton).click();
            await page.waitForURL(url => !url.pathname.includes('/login'), {
                timeout: DEFAULT_WAIT_TIMEOUT,
            });

            // Then logout
            await expect(page.locator(poLogoutButton)).toBeVisible({
                timeout: DEFAULT_WAIT_TIMEOUT,
            });
            await page.locator(poLogoutButton).click();

            await expect(page.locator(poLoginLink)).toBeVisible({
                timeout: DEFAULT_WAIT_TIMEOUT,
            });
        });
    });

    test.describe('Navigation', () => {
        test('should allow access to public pages without auth', async ({
            page,
        }) => {
            await page.context().clearCookies();

            // Both login and home pages should be accessible
            await page.goto('/login');
            await expect(page).toHaveURL(/\/login/);

            await page.goto('/');
            await expect(page).not.toHaveURL(/\/login/);
        });
    });
});
