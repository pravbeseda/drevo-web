import { test, expect } from './fixtures';

// Timeouts
const DEFAULT_WAIT_TIMEOUT = 10000;

// Page Object Selectors
const poForm = 'form';
const poUsernameInput = 'input[type="text"], input[formcontrolname="username"]';
const poPasswordInput = 'input[type="password"]';
const poSubmitButton = 'button[type="submit"]';
const poCheckbox = 'input[type="checkbox"]';
const poAuthStatus = 'app-auth-status';
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

/**
 * E2E Tests for Authentication UI
 *
 * Tests the frontend authentication flow with mocked backend:
 * - Login page functionality
 * - Auth status component states
 * - Login/logout user flows
 *
 * These tests use Playwright fixtures to mock auth API endpoints,
 * allowing them to run without a real backend (including in CI).
 */

test.describe('Authentication UI', () => {
    test.describe('Login Page', () => {
        test('should display login form with all elements', async ({
            unauthenticatedPage: page,
        }) => {
            await page.goto('/login');

            await expect(page.locator(poForm)).toBeVisible({
                timeout: DEFAULT_WAIT_TIMEOUT,
            });
            await expect(page.locator(poUsernameInput)).toBeVisible();
            await expect(page.locator(poPasswordInput)).toBeVisible();
            await expect(page.locator(poSubmitButton)).toBeVisible();
            await expect(page.locator(poCheckbox)).toBeVisible();
        });

        test('should disable submit button when form is empty', async ({
            unauthenticatedPage: page,
        }) => {
            await page.goto('/login');

            await expect(page.locator(poForm)).toBeVisible({
                timeout: DEFAULT_WAIT_TIMEOUT,
            });
            await expect(page.locator(poSubmitButton)).toBeDisabled();
        });

        test('should enable submit button when form is filled', async ({
            unauthenticatedPage: page,
        }) => {
            await page.goto('/login');

            await expect(page.locator(poForm)).toBeVisible({
                timeout: DEFAULT_WAIT_TIMEOUT,
            });

            await page
                .locator(poUsernameInput)
                .first()
                .fill(TEST_FORM_DATA.username);
            await page.locator(poPasswordInput).fill(TEST_FORM_DATA.password);

            await expect(page.locator(poSubmitButton)).toBeEnabled();
        });

        test('should keep submit disabled with empty username', async ({
            unauthenticatedPage: page,
        }) => {
            await page.goto('/login');

            await expect(page.locator(poForm)).toBeVisible({
                timeout: DEFAULT_WAIT_TIMEOUT,
            });

            // Focus and blur username field to trigger validation
            const usernameInput = page.locator(poUsernameInput).first();
            await usernameInput.focus();
            await usernameInput.blur();

            // Fill only password
            await page.locator(poPasswordInput).fill(TEST_FORM_DATA.password);

            await expect(page.locator(poSubmitButton)).toBeDisabled();
        });

        test('should show error message for invalid credentials', async ({
            unauthenticatedPage: page,
        }) => {
            await page.goto('/login');

            await expect(page.locator(poForm)).toBeVisible({
                timeout: DEFAULT_WAIT_TIMEOUT,
            });

            await page
                .locator(poUsernameInput)
                .first()
                .fill(TEST_INVALID_CREDENTIALS.username);
            await page
                .locator(poPasswordInput)
                .fill(TEST_INVALID_CREDENTIALS.password);
            await page.locator(poSubmitButton).click();

            await expect(page.locator(poErrorMessage).first()).toBeVisible({
                timeout: DEFAULT_WAIT_TIMEOUT,
            });
        });
    });

    test.describe('Auth Status Component', () => {
        test('should redirect unauthenticated user to login', async ({
            unauthenticatedPage: page,
        }) => {
            await page.goto('/');

            // Unauthenticated users are redirected to login page
            await expect(page).toHaveURL(/\/login/, {
                timeout: DEFAULT_WAIT_TIMEOUT,
            });
        });

        test('should show user info and logout button for authenticated user', async ({
            authenticatedPage: page,
        }) => {
            await page.goto('/');

            await expect(page.locator(poAuthStatus)).toBeVisible({
                timeout: DEFAULT_WAIT_TIMEOUT,
            });
            await expect(page.locator(poLogoutButton)).toBeVisible({
                timeout: DEFAULT_WAIT_TIMEOUT,
            });
        });
    });

    test.describe('Login Flow', () => {
        test('should redirect to home after successful login', async ({
            authMockedPage: page,
        }) => {
            await page.goto('/login');

            await expect(page.locator(poForm)).toBeVisible({
                timeout: DEFAULT_WAIT_TIMEOUT,
            });

            // Fill in valid credentials
            await page
                .locator(poUsernameInput)
                .first()
                .fill(TEST_FORM_DATA.username);
            await page.locator(poPasswordInput).fill(TEST_FORM_DATA.password);
            await page.locator(poSubmitButton).click();

            // Should redirect away from login page
            await page.waitForURL(url => !url.pathname.includes('/login'), {
                timeout: DEFAULT_WAIT_TIMEOUT,
            });
        });

        test('should display auth status after login', async ({
            authMockedPage: page,
        }) => {
            await page.goto('/login');

            await expect(page.locator(poForm)).toBeVisible({
                timeout: DEFAULT_WAIT_TIMEOUT,
            });

            await page
                .locator(poUsernameInput)
                .first()
                .fill(TEST_FORM_DATA.username);
            await page.locator(poPasswordInput).fill(TEST_FORM_DATA.password);
            await page.locator(poSubmitButton).click();

            // Wait for redirect
            await page.waitForURL(url => !url.pathname.includes('/login'), {
                timeout: DEFAULT_WAIT_TIMEOUT,
            });

            // Auth status should be visible after login
            await expect(page.locator(poAuthStatus)).toBeVisible({
                timeout: DEFAULT_WAIT_TIMEOUT,
            });
        });
    });

    test.describe('Logout Flow', () => {
        test('should redirect to login after logout', async ({
            authenticatedPage: page,
        }) => {
            await page.goto('/');

            await expect(page.locator(poLogoutButton)).toBeVisible({
                timeout: DEFAULT_WAIT_TIMEOUT,
            });

            await page.locator(poLogoutButton).click();

            // Should be redirected to login page after logout
            await expect(page).toHaveURL(/\/login/, {
                timeout: DEFAULT_WAIT_TIMEOUT,
            });
        });
    });

    test.describe('Navigation', () => {
        test('should redirect unauthenticated user to login from protected routes', async ({
            unauthenticatedPage: page,
        }) => {
            // Try to access protected route
            await page.goto('/');

            // Should be redirected to login
            await expect(page).toHaveURL(/\/login/);
        });

        test('should allow authenticated user to access protected routes', async ({
            authenticatedPage: page,
        }) => {
            await page.goto('/');

            // Should NOT be redirected to login
            await expect(page).not.toHaveURL(/\/login/);
        });

        test('should preserve return URL when redirecting to login', async ({
            unauthenticatedPage: page,
        }) => {
            // Try to access a specific protected route
            await page.goto('/articles/123');

            // Should be redirected to login with returnUrl
            await expect(page).toHaveURL(/\/login\?returnUrl=/);
        });
    });
});
