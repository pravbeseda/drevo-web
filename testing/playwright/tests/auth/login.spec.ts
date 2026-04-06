import { test, expect, mockLoginSuccess, mockLoginError } from '../../fixtures';
import { LoginPage } from '../../pages/login.page';

const unknownErrorMessage = 'Произошла ошибка при входе. Попробуйте еще раз.';

test.describe('Login page', () => {
    let loginPage: LoginPage;

    test.describe('Form display and validation', () => {
        test.beforeEach(async ({ unauthenticatedPage: page }) => {
            loginPage = new LoginPage(page);
            await page.goto('/login');
            await loginPage.waitForReady();
        });

        test('shows login form with all fields', async () => {
            await expect(loginPage.usernameInput).toBeVisible();
            await expect(loginPage.passwordInput).toBeVisible();
            await expect(loginPage.rememberMeCheckbox).toBeVisible();
            await expect(loginPage.submitButton).toBeVisible();
        });

        test('submit button is disabled when fields are empty', async () => {
            await expect(loginPage.submitButton).toBeDisabled();
        });

        test('submit button is disabled when only username is filled', async () => {
            await loginPage.fillUsername('testuser');

            await expect(loginPage.submitButton).toBeDisabled();
        });

        test('submit button is disabled when only password is filled', async () => {
            await loginPage.fillPassword('password123');

            await expect(loginPage.submitButton).toBeDisabled();
        });

        test('submit button is enabled when both fields are filled', async () => {
            await loginPage.fillUsername('testuser');
            await loginPage.fillPassword('password123');

            await expect(loginPage.submitButton).toBeEnabled();
        });
    });

    test.describe('Successful login', () => {
        test.beforeEach(async ({ unauthenticatedPage: page }) => {
            await mockLoginSuccess(page);
            loginPage = new LoginPage(page);
        });

        test('redirects to main page after login', async ({ unauthenticatedPage: page }) => {
            await page.goto('/login');
            await loginPage.waitForReady();

            await loginPage.login('testuser', 'password123');

            await expect(page).toHaveURL('/');
        });

        test('redirects to returnUrl after login', async ({ unauthenticatedPage: page }) => {
            await page.goto('/login?returnUrl=/articles/5');
            await loginPage.waitForReady();

            await loginPage.login('testuser', 'password123');

            await expect(page).toHaveURL('/articles/5');
        });

        test('ignores invalid returnUrl and redirects to /', async ({ unauthenticatedPage: page }) => {
            await page.goto('/login?returnUrl=//evil.com');
            await loginPage.waitForReady();

            await loginPage.login('testuser', 'password123');

            await expect(page).toHaveURL('/');
        });
    });

    test.describe('Login errors', () => {
        [
            {
                name: 'invalid credentials',
                status: 401,
                message: 'Invalid credentials',
                code: 'INVALID_CREDENTIALS',
                expected: 'Неверный логин или пароль.',
            },
            {
                name: 'inactive account',
                status: 401,
                message: 'Account not active',
                code: 'ACCOUNT_NOT_ACTIVE',
                expected: 'Аккаунт не активирован. Проверьте email для подтверждения.',
            },
            {
                name: 'server error (500)',
                status: 500,
                message: 'Internal server error',
                code: undefined,
                expected: unknownErrorMessage,
            },
        ].forEach(({ name, status, message, code, expected }) => {
            test(`shows error for ${name}`, async ({ unauthenticatedPage: page }) => {
                await mockLoginError(page, status, message, code);
                loginPage = new LoginPage(page);
                await page.goto('/login');
                await loginPage.waitForReady();

                await loginPage.login('testuser', 'password123');

                await expect(loginPage.errorMessage).toBeVisible();
                await expect(loginPage.errorMessage).toHaveText(expected);
            });
        });

        test('shows default error when response has no error field', async ({ unauthenticatedPage: page }) => {
            await page.route('**/api/auth/login', route =>
                route.fulfill({
                    status: 500,
                    json: { success: false },
                }),
            );
            loginPage = new LoginPage(page);
            await page.goto('/login');
            await loginPage.waitForReady();

            await loginPage.login('testuser', 'password123');

            await expect(loginPage.errorMessage).toBeVisible();
            await expect(loginPage.errorMessage).toHaveText(unknownErrorMessage);
        });

        test('stays on login page after error', async ({ unauthenticatedPage: page }) => {
            await mockLoginError(page, 401, 'Invalid credentials', 'INVALID_CREDENTIALS');
            loginPage = new LoginPage(page);
            await page.goto('/login');
            await loginPage.waitForReady();

            await loginPage.login('wrong', 'wrong');

            await expect(loginPage.errorMessage).toBeVisible();
            await expect(page).toHaveURL(/\/login/);
        });

        test('clears error message on new submission', async ({ unauthenticatedPage: page }) => {
            await mockLoginError(page, 401, 'Invalid credentials', 'INVALID_CREDENTIALS');
            loginPage = new LoginPage(page);
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

            loginPage = new LoginPage(page);
            await page.goto('/login');
            await loginPage.waitForReady();

            await loginPage.fillUsername('testuser');
            await loginPage.fillPassword('password123');
            await loginPage.submit();

            await expect(loginPage.submitButton).toBeDisabled();
        });
    });
});
