import { BasePage } from './base.page';

export class EditorPage extends BasePage {
    readonly skeleton = this.page.getByTestId('editor-skeleton');
    readonly container = this.page.getByTestId('editor-container');

    async waitForReady(): Promise<void> {
        // Editor either shows skeleton (waiting for postMessage) or loaded container
        await this.skeleton
            .or(this.container)
            .first()
            .waitFor({ state: 'visible' });
    }
}
