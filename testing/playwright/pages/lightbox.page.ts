import { BasePage } from './base.page';

export class LightboxPage extends BasePage {
    readonly backdrop = this.page.getByTestId('lightbox-backdrop');
    readonly close = this.page.getByTestId('lightbox-close');
    readonly image = this.page.getByTestId('lightbox-image');
    readonly footer = this.page.getByTestId('lightbox-footer');
    readonly titleLink = this.page.getByTestId('lightbox-detail-link');

    async waitForReady(): Promise<void> {
        await this.image.waitFor({ state: 'visible' });
    }
}
