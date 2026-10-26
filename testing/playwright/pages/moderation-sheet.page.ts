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
    readonly comment = this.page.getByTestId('moderation-comment').locator('textarea');
    readonly aiToggle = this.page.getByTestId('moderation-check-ai-toggle');
    readonly aiKeyField = this.page.getByTestId('moderation-check-ai-key');
    readonly aiKey = this.aiKeyField.locator('input');
    readonly aiThresholds = this.page.getByTestId('moderation-check-ai-thresholds');
    readonly aiFindingThreshold = this.page.getByTestId('moderation-check-ai-finding').locator('input');
    readonly aiSave = this.page.getByTestId('moderation-check-ai-save');
    readonly aiProgress = this.page.getByTestId('moderation-check-ai-progress');
    readonly aiAnswers = this.page.getByTestId('ai-locate-answer');

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

    /** The quote on the n-th card, counting from 0, which shows the finding in the text. */
    showInText(index: number): Locator {
        return this.findings.nth(index).getByTestId('moderation-check-quote');
    }

    /** The Haiku or Luna button of the first AI card. */
    aiLocate(model: 'haiku' | 'luna'): Locator {
        return this.page.getByTestId(`ai-locate-${model}`).first();
    }

    /** The n-th fragment a model located, counting from 0, which shows it in the text. */
    aiFragment(index: number): Locator {
        return this.page.getByTestId('ai-locate-fragment').nth(index);
    }

    async connectAi(key: string): Promise<void> {
        await this.aiToggle.click();
        await this.aiKey.fill(key);
        await this.aiSave.click();
    }

    async waitForReady(): Promise<void> {
        await this.verdict.waitFor({ state: 'visible' });
    }
}
