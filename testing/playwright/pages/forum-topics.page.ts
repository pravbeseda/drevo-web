import { BasePage } from './base.page';
import { Locator } from '@playwright/test';

export class ForumTopicsPage extends BasePage {
    readonly items = this.page.getByTestId('topic-item');
    readonly empty = this.page.getByTestId('topics-empty');
    readonly notFound = this.page.getByTestId('topics-not-found');
    /** The pane that holds the list; the list inside it is what scrolls. */
    readonly list = this.page.getByTestId('forum-panes-list');
    readonly scroller = this.page.getByTestId('topic-list');
    readonly loadError = this.page.getByTestId('topic-list-error');
    readonly retry = this.page.getByTestId('topic-list-retry');
    readonly panes = this.page.getByTestId('forum-panes');
    readonly resizeHandle = this.page.getByTestId('forum-panes-handle');
    /** OverlayScrollbars draws the scrollbar and takes no test id, so its own classes are the only hook. */
    readonly scrollbarTrack = this.scroller.locator('.os-scrollbar-vertical .os-scrollbar-track');
    readonly scrollbarHandle = this.scrollbarTrack.locator('.os-scrollbar-handle');

    /** A topic row is the first thing the resolved section puts on screen. */
    async waitForReady(): Promise<void> {
        await this.items.first().waitFor({ state: 'visible' });
    }

    title(text: string): Locator {
        return this.page.getByTestId('topic-title').filter({ hasText: text });
    }

    /** The title that reads exactly `text` — `title('Тема 1')` also finds «Тема 10». */
    exactTitle(text: string): Locator {
        return this.page.getByTestId('topic-title').filter({ hasText: new RegExp(`^\\s*${text}\\s*$`) });
    }

    /** The row's link, found by the topic it opens. */
    link(text: string): Locator {
        return this.page.getByTestId('topic-link').filter({ has: this.title(text) });
    }

    avatar(text: string): Locator {
        return this.link(text).getByTestId('topic-author-avatar');
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

    /** How many rendered rows leave their content less room than it takes, so it eats into the row's padding. */
    crampedRowCount(): Promise<number> {
        return this.page.getByTestId('topic-link').evaluateAll(
            links =>
                links.filter(link => {
                    const style = getComputedStyle(link);
                    const room = link.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
                    const content = Math.max(
                        ...Array.from(link.children, child => child.getBoundingClientRect().height),
                    );
                    return content > room;
                }).length,
        );
    }

    /** Scrolls the list to its end, as far as the rows loaded so far reach. */
    async scrollToEnd(): Promise<void> {
        await this.scroller.evaluate(scroller => scroller.scrollTo({ top: scroller.scrollHeight }));
    }

    async open(text: string): Promise<void> {
        await this.title(text).click();
    }
}
