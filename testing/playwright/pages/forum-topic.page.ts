import { BasePage } from './base.page';
import { Locator } from '@playwright/test';

export class ForumTopicPage extends BasePage {
    /** The topic's title and what it hangs off live in the app header, not on the topic itself. */
    readonly title = this.page.getByTestId('page-title');
    readonly subtitle = this.page.getByTestId('page-subtitle');
    readonly subtitleLink = this.page.getByTestId('page-subtitle-link');
    /** The messages, and the element they scroll in. */
    readonly feed = this.page.getByTestId('topic-feed');
    /** OverlayScrollbars draws the scrollbar and takes no test id, so its own classes are the only hook. */
    readonly feedScrollbarHandle = this.feed.locator('.os-scrollbar-vertical .os-scrollbar-handle');
    readonly composer = this.page.getByTestId('topic-composer');
    readonly replyTo = this.page.getByTestId('message-reply-to');
    readonly notFound = this.page.getByTestId('topic-not-found');
    readonly loadError = this.page.getByTestId('topic-load-error');
    readonly composerEditor = this.page.getByTestId('composer-editor');
    readonly composerText = this.composerEditor.locator('.cm-content');
    readonly composerGutter = this.composerEditor.locator('.cm-gutters');
    /** CodeMirror's own box inside the field, which paints the field's fill. */
    readonly composerField = this.composerEditor.locator('.cm-editor');
    readonly send = this.page.getByTestId('forum-send');
    readonly replyChip = this.page.getByTestId('composer-reply');
    readonly replyChipAuthor = this.page.getByTestId('composer-reply-author');
    readonly cancelReply = this.page.getByTestId('composer-reply-cancel');
    readonly composerError = this.page.getByTestId('composer-error');
    readonly composerActions = this.page.getByTestId('composer-actions');
    readonly composerFrame = this.page.getByTestId('composer-frame');
    readonly composerExpand = this.page.getByTestId('composer-expand');

    /** The feed renders only once the topic has resolved. */
    async waitForReady(): Promise<void> {
        await this.feed.waitFor({ state: 'visible' });
    }

    /** A message card names the message rather than its position in the list. */
    message(id: number): Locator {
        return this.page.getByTestId(`message-${id}`);
    }

    /** When a message was posted, as the card words it. */
    messageDate(id: number): Locator {
        return this.message(id).getByTestId('message-date');
    }

    /** What the highlight actually paints — a token that resolves to nothing would match the plain card. */
    messageBackground(id: number): Promise<string> {
        return this.message(id).evaluate(element => getComputedStyle(element).backgroundColor);
    }

    /** Moves the feed to one of its ends, as far as a reader's wheel would. */
    scrollTo(end: 'top' | 'bottom'): Promise<void> {
        return this.feed.evaluate((feed, to) => {
            feed.scrollTop = to === 'top' ? 0 : feed.scrollHeight;
        }, end);
    }

    /** How far the feed is from its end — 0 when the reader is at the last message. */
    distanceToBottom(): Promise<number> {
        return this.feed.evaluate(feed => feed.scrollHeight - feed.clientHeight - feed.scrollTop);
    }

    /** The ↩ of a card. */
    async answer(id: number): Promise<void> {
        await this.revealActions(id);
        await this.message(id).getByTestId('message-reply').click();
    }

    /** «Цитировать» from the ⋯ menu of a card. */
    async quote(id: number): Promise<void> {
        await this.revealActions(id);
        await this.message(id).getByTestId('message-more').click();
        await this.page.getByTestId('message-quote').click();
    }

    /** A card shows its actions on hover, or on a tap on a screen without hover. */
    private async revealActions(id: number): Promise<void> {
        const canHover = await this.page.evaluate(() => matchMedia('(hover: hover)').matches);
        if (canHover) {
            await this.message(id).hover();
        } else {
            await this.message(id).tap();
        }
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

    /** How far the middle of the refusal sits from the frame's top edge — none when it is cut into that edge. */
    async composerErrorOffset(): Promise<number | undefined> {
        const [frame, error] = await Promise.all([this.composerFrame.boundingBox(), this.composerError.boundingBox()]);
        return frame && error ? Math.round(Math.abs(error.y + error.height / 2 - frame.y)) : undefined;
    }

    /**
     * Puts the text in as one input rather than key by key, so a line break gets
     * through on a phone too: on Android CodeMirror leaves Enter to the on-screen
     * keyboard, which device emulation does not have.
     */
    async write(text: string): Promise<void> {
        await this.composerText.click();
        await this.page.keyboard.insertText(text);
    }

    /** Ctrl+Enter, ⌘+Enter on a Mac. */
    async sendByShortcut(): Promise<void> {
        await this.page.keyboard.press('ControlOrMeta+Enter');
    }
}
