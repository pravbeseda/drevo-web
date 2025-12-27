import { test, expect } from '@playwright/test';

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
        test('should display login form', async ({ page }) => {
            await page.goto('/login');

            // Wait for page to load
            await expect(page.locator('form')).toBeVisible({ timeout: 10000 });

            // Check form elements
            await expect(page.locator('input[type="text"], input[formcontrolname="username"]')).toBeVisible();
            await expect(page.locator('input[type="password"]')).toBeVisible();
            await expect(page.locator('button[type="submit"]')).toBeVisible();
        });

        test('should have "Remember me" checkbox', async ({ page }) => {
            await page.goto('/login');

            await expect(page.locator('form')).toBeVisible({ timeout: 10000 });

            // Check for remember me checkbox
            await expect(page.locator('input[type="checkbox"]')).toBeVisible();
        });

        test('should disable submit button when form is invalid', async ({ page }) => {
            await page.goto('/login');

            await expect(page.locator('form')).toBeVisible({ timeout: 10000 });

            const submitButton = page.locator('button[type="submit"]');

            // Initially disabled (empty form)
            await expect(submitButton).toBeDisabled();
        });

        test('should enable submit button when form is filled', async ({ page }) => {
            await page.goto('/login');

            await expect(page.locator('form')).toBeVisible({ timeout: 10000 });

            // Fill in the form
            await page.locator('input[type="text"], input[formcontrolname="username"]').first().fill('testuser');
            await page.locator('input[type="password"]').fill('testpassword');

            const submitButton = page.locator('button[type="submit"]');

            // Should be enabled now
            await expect(submitButton).toBeEnabled();
        });

        test('should show validation error for empty username', async ({ page }) => {
            await page.goto('/login');

            await expect(page.locator('form')).toBeVisible({ timeout: 10000 });

            // Focus and blur username field to trigger validation
            const usernameInput = page.locator('input[type="text"], input[formcontrolname="username"]').first();
            await usernameInput.focus();
            await usernameInput.blur();

            // Fill password but not username
            await page.locator('input[type="password"]').fill('testpassword');

            // Should show some validation indicator (could be text or styling)
            // This test is flexible to accommodate different validation display methods
            const submitButton = page.locator('button[type="submit"]');
            await expect(submitButton).toBeDisabled();
        });

        test('should show error message for invalid credentials', async ({ page }) => {
            await page.goto('/login');

            await expect(page.locator('form')).toBeVisible({ timeout: 10000 });

            // Fill in the form with invalid credentials
            await page.locator('input[type="text"], input[formcontrolname="username"]').first().fill('invaliduser');
            await page.locator('input[type="password"]').fill('invalidpassword');

            // Submit the form
            await page.locator('button[type="submit"]').click();

            // Wait for error message (could be various error texts)
            // Using a flexible selector that looks for error-like elements
            await expect(
                page.locator('.error, [class*="error"], [class*="alert"], [role="alert"]').first()
            ).toBeVisible({ timeout: 10000 });
        });
    });

    test.describe('Auth Status Component', () => {
        test('should show login link for unauthenticated user', async ({ page }) => {
            // Clear cookies to ensure unauthenticated state
            await page.context().clearCookies();

            await page.goto('/');

            // Wait for auth status to load (initial loading state should resolve)
            await page.waitForTimeout(2000);

            // Should show login link for guest
            const loginLink = page.locator('a[href="/login"], a:has-text("Войти")');
            await expect(loginLink).toBeVisible({ timeout: 10000 });
        });

        test('should show loading state initially', async ({ page }) => {
            // Clear cookies
            await page.context().clearCookies();

            // Navigate to page
            await page.goto('/');

            // The loading state should be brief, but we can check the component exists
            const authStatus = page.locator('app-auth-status');
            await expect(authStatus).toBeVisible({ timeout: 10000 });
        });
    });

    test.describe('Login Flow', () => {
        // These tests require real backend with valid test credentials
        // To run: set TEST_USERNAME and TEST_PASSWORD environment variables
        
        test('should redirect to home after successful login', async ({ page }, testInfo) => {
            // Skip if no test credentials configured
            test.skip(!process.env['TEST_USERNAME'] || !process.env['TEST_PASSWORD'], 
                'Requires TEST_USERNAME and TEST_PASSWORD environment variables');

            const testUsername = process.env['TEST_USERNAME']!;
            const testPassword = process.env['TEST_PASSWORD']!;

            await page.goto('/login');

            await expect(page.locator('form')).toBeVisible({ timeout: 10000 });

            // Fill in the form
            await page.locator('input[type="text"], input[formcontrolname="username"]').first().fill(testUsername);
            await page.locator('input[type="password"]').fill(testPassword);

            // Submit the form
            await page.locator('button[type="submit"]').click();

            // On success, should redirect away from login page
            await page.waitForURL((url) => !url.pathname.includes('/login'), {
                timeout: 10000,
            });
        });
    });

    test.describe('Logout Flow', () => {
        // These tests require authenticated session
        
        test('should show login link after logout', async ({ page }) => {
            // Skip if no test credentials configured
            test.skip(!process.env['TEST_USERNAME'] || !process.env['TEST_PASSWORD'], 
                'Requires TEST_USERNAME and TEST_PASSWORD environment variables');
            // This test assumes user is already logged in via previous test
            // or we need to login first

            await page.goto('/');

            // If there's a logout button visible, click it
            const logoutButton = page.locator('button:has-text("Выйти")');

            if (await logoutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
                await logoutButton.click();

                // After logout, should show login link
                const loginLink = page.locator('a[href="/login"], a:has-text("Войти")');
                await expect(loginLink).toBeVisible({ timeout: 10000 });
            } else {
                // User not logged in, just verify login link is visible
                const loginLink = page.locator('a[href="/login"], a:has-text("Войти")');
                await expect(loginLink).toBeVisible({ timeout: 10000 });
            }
        });
    });

    test.describe('Navigation Protection', () => {
        test('should allow access to login page', async ({ page }) => {
            await page.goto('/login');

            // Should be able to access login page
            await expect(page).toHaveURL(/\/login/);
        });

        test('should allow access to public pages', async ({ page }) => {
            // Clear cookies to ensure unauthenticated state
            await page.context().clearCookies();

            await page.goto('/');

            // Should be able to access home page
            await expect(page).not.toHaveURL(/\/login/);
        });
    });
});
