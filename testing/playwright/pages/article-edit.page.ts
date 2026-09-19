import { BasePage } from './base.page';

export class ArticleEditPage extends BasePage {
    /** Root workspace element (data-testid="article-edit") */
    readonly root = this.page.getByTestId('article-edit');
    /** CodeMirror editor container */
    readonly editorContainer = this.page.getByTestId('editor-container');
    /** CodeMirror editable content — its text is the current editor value */
    readonly editorContent = this.editorContainer.locator('.cm-content');
    /** CodeMirror gutter markers for warnings only */
    readonly lintWarningMarkers = this.editorContainer.locator('.cm-lint-marker-warning');
    /** CodeMirror gutter markers for warnings and errors */
    readonly lintMarkers = this.editorContainer.locator('.cm-lint-marker-warning, .cm-lint-marker-error');
    /** CodeMirror lint panel listing the problems */
    readonly lintPanel = this.editorContainer.locator('.cm-panel-lint');
    /** Validation status indicator; clicking it toggles the lint panel */
    readonly validationIndicator = this.page.getByTestId('validation-indicator');
    /** Warning count inside the validation indicator */
    readonly validationWarning = this.validationIndicator.locator('.validation-indicator__warning');
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
        await this.editorContent.click();
        await this.page.keyboard.press('ControlOrMeta+a');
        await this.page.keyboard.type(text);
    }

    /** Type text at the end of the current editor line, keeping the existing content */
    async appendToEditor(text: string): Promise<void> {
        await this.editorContent.click();
        await this.page.keyboard.press('End');
        await this.page.keyboard.type(text);
    }
}
