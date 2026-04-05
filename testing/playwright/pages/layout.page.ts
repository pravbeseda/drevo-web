import { BasePage } from './base.page';

export class LayoutPage extends BasePage {
    readonly header = this.page.getByTestId('header');
    readonly sidebar = this.page.getByTestId('sidebar');
    readonly accountButton = this.page.getByTestId('account-button');
    readonly userName = this.page.getByTestId('user-name');

    /** Open the account dropdown menu */
    async openAccountMenu(): Promise<void> {
        await this.accountButton.click();
    }
}
