import { BasePage } from './base.page';

export class LayoutPage extends BasePage {
    readonly header = this.page.getByTestId('header');
    readonly sidebar = this.page.getByTestId('sidebar');
    readonly accountButton = this.page.getByTestId('account-button');
    readonly userName = this.page.getByTestId('user-name');
    readonly logoutButton = this.page.getByTestId('logout-button');

    async waitForReady(): Promise<void> {
        await this.header.waitFor({ state: 'visible' });
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
}
