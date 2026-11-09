import { BasePage } from './base.page';

export class PictureGalleryPage extends BasePage {
    readonly root = this.page.getByTestId('pictures-page');
    readonly searchBar = this.page.getByTestId('pictures-search-bar');
    readonly searchInput = this.searchBar.locator('input');
    readonly loading = this.page.getByTestId('pictures-loading');
    readonly gallery = this.page.getByTestId('pictures-gallery');
    readonly empty = this.page.getByTestId('pictures-empty');
    readonly cards = this.page.getByTestId('picture-card');
    readonly firstCardImage = this.cards.first().locator('img');
    readonly loadingMore = this.page.getByTestId('pictures-scroller').locator('ui-spinner');

    async waitForReady(): Promise<void> {
        await this.root.waitFor({ state: 'visible' });
    }

    /** Wait for gallery with rendered cards (pictures loaded + layout computed) */
    async waitForGallery(): Promise<void> {
        await this.gallery.waitFor({ state: 'visible' });
        // Wait for at least one card to render (ResizeObserver debounce + row building)
        await this.cards.first().waitFor({ state: 'visible' });
    }

    /** Wait for empty state to appear */
    async waitForEmpty(): Promise<void> {
        await this.empty.waitFor({ state: 'visible' });
    }

    /** Type into the search input */
    async search(query: string): Promise<void> {
        await this.searchInput.fill(query);
    }

    /** Full height of the list, which grows when a page joins it */
    async scrollHeight(): Promise<number> {
        return this.page.getByTestId('pictures-scroller').evaluate(el => el.scrollHeight);
    }

    /** Scroll virtual scroller to the bottom */
    async scrollToBottom(): Promise<void> {
        await this.page.getByTestId('pictures-scroller').evaluate(el => {
            el.scrollTop = el.scrollHeight;
        });
    }

    /** Scroll the way a wheel flick does: fast, frame after frame, until the end of the list stops it */
    async flingToEnd(pxPerFrame = 300): Promise<void> {
        await this.page.getByTestId('pictures-scroller').evaluate(
            (el, step) =>
                new Promise<void>(resolve => {
                    const advance = (): void => {
                        const before = el.scrollTop;
                        el.scrollTop += step;
                        if (el.scrollTop === before) {
                            resolve();
                        } else {
                            requestAnimationFrame(advance);
                        }
                    };
                    advance();
                }),
            pxPerFrame,
        );
    }
}
