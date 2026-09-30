import { BasePage } from './base.page';
import { Locator } from '@playwright/test';

export class ForumTopicPage extends BasePage {
    /** The topic's title and what it hangs off live in the app header, not on the topic itself. */
    readonly title = this.page.getByTestId('page-title');
    readonly subtitle = this.page.getByTestId('page-subtitle');
    readonly subtitleLink = this.page.getByTestId('page-subtitle-link');
    readonly feed = this.page.getByTestId('topic-feed');
    readonly replyTo = this.page.getByTestId('message-reply-to');
    readonly notFound = this.page.getByTestId('topic-not-found');
    readonly loadError = this.page.getByTestId('topic-load-error');
    readonly composerEditor = this.page.getByTestId('composer-editor');
    readonly composerText = this.composerEditor.locator('.cm-content');
    readonly composerGutter = this.composerEditor.locator('.cm-gutters');
    readonly send = this.page.getByTestId('forum-send');
    readonly replyChip = this.page.getByTestId('composer-reply');
    readonly replyChipAuthor = this.page.getByTestId('composer-reply-author');
    readonly cancelReply = this.page.getByTestId('composer-reply-cancel');
    readonly composerError = this.page.getByTestId('composer-error');
    readonly composerPending = this.page.getByTestId('composer-pending');
    readonly composerActions = this.page.getByTestId('composer-actions');

    /** The feed renders only once the topic has resolved. */
    async waitForReady(): Promise<void> {
        await this.feed.waitFor({ state: 'visible' });
    }

    /** A message card names the message rather than its position in the list. */
    message(id: number): Locator {
        return this.page.getByTestId(`message-${id}`);
    }

    /** What the highlight actually paints — a token that resolves to nothing would match the plain card. */
    messageBackground(id: number): Promise<string> {
        return this.message(id).evaluate(element => getComputedStyle(element).backgroundColor);
    }

    /** Moves the pane the topic scrolls in to one of its ends, as far as a reader's wheel would. */
    scrollTo(end: 'top' | 'bottom'): Promise<void> {
        return this.feed.evaluate((feed, to) => {
            let scroller = feed.parentElement;
            while (
                scroller &&
                !(
                    scroller.scrollHeight > scroller.clientHeight &&
                    /auto|scroll/.test(getComputedStyle(scroller).overflowY)
                )
            ) {
                scroller = scroller.parentElement;
            }
            if (scroller) {
                scroller.scrollTop = to === 'top' ? 0 : scroller.scrollHeight;
            }
        }, end);
    }

    /** The ↩ of a card, which shows on hover. */
    async answer(id: number): Promise<void> {
        await this.message(id).hover();
        await this.message(id).getByTestId('message-reply').click();
    }

    /** «Цитировать» from the ⋯ menu of a card. */
    async quote(id: number): Promise<void> {
        await this.message(id).hover();
        await this.message(id).getByTestId('message-more').click();
        await this.page.getByTestId('message-quote').click();
    }

    composerHeight(): Promise<number> {
        return this.composerEditor.evaluate(host => host.getBoundingClientRect().height);
    }

    /** Height the composer's editor keeps beyond its text — none when the field is sized to what it holds. */
    composerSpareHeight(): Promise<number> {
        return this.composerEditor.evaluate(host => {
            const editor = host.querySelector('.cm-editor');
            const content = host.querySelector('.cm-content');
            return editor && content
                ? Math.round(editor.getBoundingClientRect().height - content.getBoundingClientRect().height)
                : Number.NaN;
        });
    }

    /** Space between the last line of the composer's error and the action bar under it — the text, not its box. */
    async composerErrorClearance(): Promise<number | undefined> {
        const actions = await this.composerActions.boundingBox();
        const textBottom = await this.composerError.evaluate(error => {
            const range = error.ownerDocument.createRange();
            range.selectNodeContents(error);
            return range.getBoundingClientRect().bottom;
        });
        return actions ? Math.round(actions.y - textBottom) : undefined;
    }

    async write(text: string): Promise<void> {
        await this.composerText.click();
        await this.page.keyboard.type(text);
    }

    /** Ctrl+Enter, ⌘+Enter on a Mac. */
    async sendByShortcut(): Promise<void> {
        await this.page.keyboard.press('ControlOrMeta+Enter');
    }
}
