import { BasePage } from './base.page';
import { Locator } from '@playwright/test';

export class DiffPage extends BasePage {
    readonly error: Locator = this.page.getByTestId('diff-error');
    readonly meta: Locator = this.page.getByTestId('diff-meta');
    readonly toggleButton: Locator = this.sidebarAction('diff-toggle');
    /** Moderation sidebar action (desktop sidebar or mobile FAB, moderators only) */
    readonly moderationAction: Locator = this.sidebarAction('moderation-action');

    readonly cmDiff: Locator = this.page.getByTestId('diff-cm');

    // CodeMirror builds its own DOM, which cannot carry data-testid: its class names are the stable markers.
    readonly changedLine: Locator = this.cmDiff.locator('.cm-changedLine, .cm-inlineChangedLine').first();
    readonly changedText: Locator = this.cmDiff.locator('.cm-changedText').first();
    readonly deletedText: Locator = this.cmDiff.locator('.cm-deletedText').first();
    readonly deletedChunk: Locator = this.cmDiff.locator('.cm-deletedChunk').first();
    readonly changeMarker: Locator = this.cmDiff.locator('.cm-changedLineGutter, .cm-inlineChangedLineGutter').first();

    async waitForReady(): Promise<void> {
        await Promise.race([this.meta.waitFor({ state: 'visible' }), this.error.waitFor({ state: 'visible' })]);
    }
}
