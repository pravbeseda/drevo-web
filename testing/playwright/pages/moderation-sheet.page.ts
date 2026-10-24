import { BasePage } from './base.page';
import { Locator } from '@playwright/test';

type SheetMode = 'unified' | 'side-by-side' | 'source';

/** The moderation sheet the «Модерация» action opens, on any page. */
export class ModerationSheetPage extends BasePage {
    readonly closeButton = this.page.getByTestId('moderation-sheet-close');
    readonly textPane = this.page.getByTestId('moderation-sheet-text');
    readonly decisionPane = this.page.getByTestId('moderation-sheet-decision');
    readonly textTab = this.page.getByTestId('moderation-sheet-tab-text');
    readonly decisionTab = this.page.getByTestId('moderation-sheet-tab-decision');

    readonly checkWholeText = this.page.getByTestId('moderation-check-full');
    readonly checkChanges = this.page.getByTestId('moderation-check-changes');
    readonly verdict = this.page.getByTestId('moderation-check-verdict');
    readonly findings = this.page.getByTestId('moderation-check-item');
    readonly comment = this.page.getByLabel('Комментарий');

    // CodeMirror builds its own DOM, which cannot carry data-testid: its class names are the stable markers.
    readonly editor = this.textPane.locator('.cm-editor').last();
    readonly marks = this.textPane.locator('.cm-finding');
    readonly focusedMark = this.textPane.locator('.cm-finding-focused');
    readonly deletedChunks = this.textPane.locator('.cm-deletedChunk');

    mode(mode: SheetMode): Locator {
        return this.page.getByTestId(`toggle-${mode}`);
    }

    /** «+ В комментарий» on the n-th card, counting from 0. */
    addToComment(index: number): Locator {
        return this.findings.nth(index).getByTestId('moderation-check-add');
    }

    /** «Показать в тексте» on the n-th card, counting from 0. */
    showInText(index: number): Locator {
        return this.findings.nth(index).getByTestId('moderation-check-show');
    }

    async waitForReady(): Promise<void> {
        await this.verdict.waitFor({ state: 'visible' });
    }
}
