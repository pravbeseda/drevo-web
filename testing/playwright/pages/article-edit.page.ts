import { BasePage } from './base.page';

export class ArticleEditPage extends BasePage {
    /** Root workspace element (data-testid="article-edit") */
    readonly root = this.page.getByTestId('article-edit');
    /** CodeMirror editor container */
    readonly editorContainer = this.page.getByTestId('editor-container');
    /** Save sidebar action button (desktop sidebar or mobile FAB) */
    readonly saveAction = this.sidebarAction('save-action');
    /** Cancel sidebar action button (desktop sidebar or mobile FAB) */
    readonly cancelAction = this.sidebarAction('cancel-action');
    /** Preview formatted content */
    readonly previewContent = this.page.getByTestId('preview-content');
    /** Preview loading spinner */
    readonly previewLoading = this.page.getByTestId('preview-loading');
    /** Preview error message */
    readonly previewError = this.page.getByTestId('preview-error');

    /** Tab buttons (workspace-tab-btn-{index}) */
    readonly tabEditor = this.page.getByTestId('workspace-tab-btn-0');
    readonly tabPreview = this.page.getByTestId('workspace-tab-btn-1');
    readonly tabDiff = this.page.getByTestId('workspace-tab-btn-2');

    async waitForReady(): Promise<void> {
        await this.root.waitFor({ state: 'visible' });
    }

    async clickSave(): Promise<void> {
        await this.saveAction.click();
    }

    async clickCancel(): Promise<void> {
        await this.cancelAction.click();
    }

    async clickPreviewTab(): Promise<void> {
        await this.tabPreview.click();
    }

    /**
     * Type text in the CodeMirror editor, replacing all existing content.
     * Selects all with Ctrl+A then types the new text.
     */
    async typeInEditor(text: string): Promise<void> {
        const cmContent = this.editorContainer.locator('.cm-content');
        await cmContent.click();
        await this.page.keyboard.press('ControlOrMeta+a');
        await this.page.keyboard.type(text);
    }
}
