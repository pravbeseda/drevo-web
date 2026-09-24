import { BasePage } from './base.page';
import { Locator } from '@playwright/test';

export class ForumTopicsPage extends BasePage {
    readonly items = this.page.getByTestId('topic-item');
    readonly empty = this.page.getByTestId('topics-empty');
    readonly notFound = this.page.getByTestId('topics-not-found');
    readonly list = this.page.getByTestId('forum-panes-list');
    readonly panes = this.page.getByTestId('forum-panes');
    readonly resizeHandle = this.page.getByTestId('forum-panes-handle');
    /** OverlayScrollbars draws the scrollbar and takes no test id, so its own classes are the only hook. */
    readonly scrollbarTrack = this.list.locator('.os-scrollbar-vertical .os-scrollbar-track');
    readonly scrollbarHandle = this.scrollbarTrack.locator('.os-scrollbar-handle');

    /** A topic row is the first thing the resolved section puts on screen. */
    async waitForReady(): Promise<void> {
        await this.items.first().waitFor({ state: 'visible' });
    }

    title(text: string): Locator {
        return this.page.getByTestId('topic-title').filter({ hasText: text });
    }

    /** The row's link, found by the topic it opens. */
    link(text: string): Locator {
        return this.page.getByTestId('topic-link').filter({ has: this.title(text) });
    }

    context(text: string): Locator {
        return this.link(text).getByTestId('topic-context');
    }

    /** Drags the border between the list and the topic by `distance` pixels, right being positive. */
    async dragColumnBorder(distance: number): Promise<void> {
        const box = await this.resizeHandle.boundingBox();
        const x = (box?.x ?? 0) + (box?.width ?? 0) / 2;
        const y = (box?.y ?? 0) + (box?.height ?? 0) / 2;
        await this.page.mouse.move(x, y);
        await this.page.mouse.down();
        await this.page.mouse.move(x + distance, y);
        await this.page.mouse.up();
    }

    async open(text: string): Promise<void> {
        await this.title(text).click();
    }
}
