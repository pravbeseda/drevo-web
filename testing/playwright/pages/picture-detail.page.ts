import { BasePage } from './base.page';

export class PictureDetailPage extends BasePage {
    readonly image = this.page.getByTestId('detail-image');
    readonly title = this.page.getByTestId('detail-title');
    readonly author = this.page.getByTestId('detail-author');
    readonly dimensions = this.page.getByTestId('detail-dimensions');

    // Title editing
    readonly titleEdit = this.page.getByTestId('detail-title-edit');
    readonly titleInput = this.page.getByTestId('detail-title-input');
    readonly titleError = this.page.getByTestId('detail-title-error');

    // Articles section
    readonly articlesLoading = this.page.getByTestId('detail-articles-loading');
    readonly articles = this.page.getByTestId('detail-articles');
    readonly articleLinks = this.page.getByTestId('detail-article-link');
    readonly articlesEmpty = this.page.getByTestId('detail-articles-empty');
    readonly articlesError = this.page.getByTestId('detail-articles-error');

    // File replacement
    readonly fileInput = this.page.getByTestId('detail-file-input');
    readonly replaceFileAction = this.sidebarAction('sidebar-action-replace-file');

    // Replace file dialog
    readonly replaceDialogTitle = this.page.getByTestId('replace-file-dialog-title');
    readonly replaceDialogPreview = this.page.getByTestId('replace-file-dialog-preview');
    readonly replaceDialogTitleInput = this.page.getByTestId('replace-file-dialog-title-input');
    readonly replaceDialogTitleError = this.page.getByTestId('replace-file-dialog-title-error');
    readonly replaceDialogConfirm = this.page.getByTestId('replace-file-dialog-confirm');
    readonly replaceDialogCancel = this.page.getByTestId('replace-file-dialog-cancel');

    // Deletion
    readonly deleteAction = this.sidebarAction('sidebar-action-delete');

    // Confirmation dialog
    readonly confirmationTitle = this.page.getByTestId('confirmation-dialog-title');
    readonly confirmationConfirm = this.page.getByTestId('confirmation-dialog-confirm');
    readonly confirmationCancel = this.page.getByTestId('confirmation-dialog-cancel');

    // Error states
    readonly loadError = this.page.getByTestId('detail-load-error');
    readonly notFoundError = this.page.getByTestId('detail-error');

    async waitForReady(): Promise<void> {
        await this.image.waitFor({ state: 'visible' });
    }

    /** Click on the title to start editing */
    async startTitleEdit(): Promise<void> {
        await this.title.click();
    }

    /** Type a new title and press Enter to save */
    async editTitle(newTitle: string): Promise<void> {
        await this.startTitleEdit();
        await this.titleInput.fill(newTitle);
        await this.titleInput.press('Enter');
    }
}
