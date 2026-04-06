import { BasePage } from './base.page';

export class LoginPage extends BasePage {
    readonly form = this.page.getByTestId('login-form');
    readonly usernameInput = this.page.getByTestId('username-input').locator('input');
    readonly passwordInput = this.page.getByTestId('password-input').locator('input');
    readonly rememberMeCheckbox = this.page.getByTestId('remember-me-checkbox').locator('input');
    readonly submitButton = this.page.getByTestId('submit-button').locator('button');
    readonly errorMessage = this.page.getByTestId('error-message');

    async waitForReady(): Promise<void> {
        await this.form.waitFor({ state: 'visible' });
    }

    async fillUsername(value: string): Promise<void> {
        await this.usernameInput.fill(value);
    }

    async fillPassword(value: string): Promise<void> {
        await this.passwordInput.fill(value);
    }

    async toggleRememberMe(): Promise<void> {
        await this.rememberMeCheckbox.click();
    }

    async submit(): Promise<void> {
        await this.submitButton.click();
    }

    async login(username: string, password: string): Promise<void> {
        await this.fillUsername(username);
        await this.fillPassword(password);
        await this.submit();
    }
}
