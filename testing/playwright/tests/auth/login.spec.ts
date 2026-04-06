import { test, expect, mockLoginSuccess, mockLoginError } from '../../fixtures';
import { LoginPage } from '../../pages/login.page';

const unknownErrorMessage = 'Произошла ошибка при входе. Попробуйте еще раз.';

test.describe('Login page', () => {
    test.describe('Form display and validation', () => {
        test('shows login form with all fields', async ({ unauthenticatedPage: page }) => {
            const loginPage = new LoginPage(page);
            await page.goto('/login');
            await loginPage.waitForReady();

            await expect(loginPage.usernameInput).toBeVisible();
            await expect(loginPage.passwordInput).toBeVisible();
            await expect(loginPage.rememberMeCheckbox).toBeVisible();
            await expect(loginPage.submitButton).toBeVisible();
        });

        test('submit button is disabled when fields are empty', async ({ unauthenticatedPage: page }) => {
            const loginPage = new LoginPage(page);
            await page.goto('/login');
            await loginPage.waitForReady();

            await expect(loginPage.submitButton).toBeDisabled();
        });

        test('submit button is disabled when only username is filled', async ({ unauthenticatedPage: page }) => {
            const loginPage = new LoginPage(page);
            await page.goto('/login');
            await loginPage.waitForReady();

            await loginPage.fillUsername('testuser');

            await expect(loginPage.submitButton).toBeDisabled();
        });

        test('submit button is disabled when only password is filled', async ({ unauthenticatedPage: page }) => {
            const loginPage = new LoginPage(page);
            await page.goto('/login');
            await loginPage.waitForReady();

            await loginPage.fillPassword('password123');

            await expect(loginPage.submitButton).toBeDisabled();
        });

        test('submit button is enabled when both fields are filled', async ({ unauthenticatedPage: page }) => {
            const loginPage = new LoginPage(page);
            await page.goto('/login');
            await loginPage.waitForReady();

            await loginPage.fillUsername('testuser');
            await loginPage.fillPassword('password123');

            await expect(loginPage.submitButton).toBeEnabled();
        });
    });

    test.describe('Successful login', () => {
        test('redirects to main page after login', async ({ unauthenticatedPage: page }) => {
            await mockLoginSuccess(page);
            const loginPage = new LoginPage(page);
            await page.goto('/login');
            await loginPage.waitForReady();

            await loginPage.login('testuser', 'password123');

            await expect(page).toHaveURL('/');
        });

        test('redirects to returnUrl after login', async ({ unauthenticatedPage: page }) => {
            await mockLoginSuccess(page);
            const loginPage = new LoginPage(page);
            await page.goto('/login?returnUrl=/articles/5');
            await loginPage.waitForReady();

            await loginPage.login('testuser', 'password123');

            await expect(page).toHaveURL('/articles/5');
        });

        test('ignores invalid returnUrl and redirects to /', async ({ unauthenticatedPage: page }) => {
            await mockLoginSuccess(page);
            const loginPage = new LoginPage(page);
            await page.goto('/login?returnUrl=//evil.com');
            await loginPage.waitForReady();

            await loginPage.login('testuser', 'password123');

            await expect(page).toHaveURL('/');
        });

        test('error message is not visible after successful login', async ({ unauthenticatedPage: page }) => {
            await mockLoginSuccess(page);
            const loginPage = new LoginPage(page);
            await page.goto('/login');
            await loginPage.waitForReady();

            await loginPage.login('testuser', 'password123');

            await expect(loginPage.errorMessage).not.toBeVisible();
        });
    });

    test.describe('Login errors', () => {
        test('shows error for invalid credentials', async ({ unauthenticatedPage: page }) => {
            await mockLoginError(page, 401, 'Invalid credentials', 'INVALID_CREDENTIALS');
            const loginPage = new LoginPage(page);
            await page.goto('/login');
            await loginPage.waitForReady();

            await loginPage.login('wrong', 'wrong');

            await expect(loginPage.errorMessage).toBeVisible();
            await expect(loginPage.errorMessage).toHaveText('Неверный логин или пароль.');
        });

        test('shows error for inactive account', async ({ unauthenticatedPage: page }) => {
            await mockLoginError(page, 401, 'Account not active', 'ACCOUNT_NOT_ACTIVE');
            const loginPage = new LoginPage(page);
            await page.goto('/login');
            await loginPage.waitForReady();

            await loginPage.login('inactive', 'password123');

            await expect(loginPage.errorMessage).toBeVisible();
            await expect(loginPage.errorMessage).toHaveText(
                'Аккаунт не активирован. Проверьте email для подтверждения.',
            );
        });

        test('shows default error message on 500', async ({ unauthenticatedPage: page }) => {
            await mockLoginError(page, 500, 'Internal server error');
            const loginPage = new LoginPage(page);
            await page.goto('/login');
            await loginPage.waitForReady();

            await loginPage.login('testuser', 'password123');

            await expect(loginPage.errorMessage).toBeVisible();
            await expect(loginPage.errorMessage).toHaveText(unknownErrorMessage);
        });

        test('shows HTTP error message when response has no error field', async ({ unauthenticatedPage: page }) => {
            await page.route('**/api/auth/login', route =>
                route.fulfill({
                    status: 500,
                    json: { success: false },
                }),
            );
            const loginPage = new LoginPage(page);
            await page.goto('/login');
            await loginPage.waitForReady();

            await loginPage.login('testuser', 'password123');

            await expect(loginPage.errorMessage).toBeVisible();
            await expect(loginPage.errorMessage).toHaveText(unknownErrorMessage);
        });

        test('stays on login page after error', async ({ unauthenticatedPage: page }) => {
            await mockLoginError(page, 401, 'Invalid credentials', 'INVALID_CREDENTIALS');
            const loginPage = new LoginPage(page);
            await page.goto('/login');
            await loginPage.waitForReady();

            await loginPage.login('wrong', 'wrong');

            await expect(loginPage.errorMessage).toBeVisible();
            await expect(page).toHaveURL(/\/login/);
        });

        test('clears error message on new submission', async ({ unauthenticatedPage: page }) => {
            await mockLoginError(page, 401, 'Invalid credentials', 'INVALID_CREDENTIALS');
            const loginPage = new LoginPage(page);
            await page.goto('/login');
            await loginPage.waitForReady();

            // First attempt — error appears
            await loginPage.login('wrong', 'wrong');
            await expect(loginPage.errorMessage).toBeVisible();

            // Replace mock with success
            await page.unroute('**/api/auth/login');
            await mockLoginSuccess(page);

            // Second attempt — error clears, redirects
            await loginPage.login('testuser', 'password123');
            await expect(loginPage.errorMessage).not.toBeVisible();
        });
    });

    test.describe('Loading state', () => {
        test('disables submit button during submission', async ({ unauthenticatedPage: page }) => {
            // Use a delayed response to observe the loading state
            await page.route('**/api/auth/login', async route => {
                await new Promise(resolve => setTimeout(resolve, 500));
                await route.fulfill({
                    json: {
                        success: true,
                        data: {
                            isAuthenticated: true,
                            user: {
                                id: 1,
                                login: 'testuser',
                                name: 'Test User',
                                email: 'test@example.com',
                                role: 'user',
                                permissions: { canEdit: true, canModerate: false, canAdmin: false },
                            },
                            csrfToken: 'new-token',
                        },
                    },
                });
            });

            const loginPage = new LoginPage(page);
            await page.goto('/login');
            await loginPage.waitForReady();

            await loginPage.fillUsername('testuser');
            await loginPage.fillPassword('password123');
            await loginPage.submit();

            // Button should be disabled while request is in progress
            await expect(loginPage.submitButton).toBeDisabled();
        });
    });
});
