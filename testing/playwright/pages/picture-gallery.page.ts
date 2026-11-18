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

    /**
     * Scroll down a step at a time and return how far, at worst, a picture strayed from the scroll:
     * zero when the pictures move exactly as far as the list scrolls.
     */
    async largestJumpWhileScrolling(distancePx: number, stepPx = 20): Promise<number> {
        return this.page.getByTestId('pictures-scroller').evaluate(
            async (scroller, { distance, step }) => {
                const nextFrame = (): Promise<number> => new Promise(resolve => requestAnimationFrame(resolve));
                const cardTop = (href: string): number | undefined =>
                    scroller.querySelector(`[data-testid="picture-card"][href="${href}"]`)?.getBoundingClientRect().top;
                const firstVisibleCard = (): { href: string; top: number; scrollTop: number } | undefined => {
                    const visibleTop = scroller.getBoundingClientRect().top;
                    const card = Array.from(scroller.querySelectorAll('[data-testid="picture-card"]')).find(
                        candidate => candidate.getBoundingClientRect().top >= visibleTop,
                    );
                    const href = card?.getAttribute('href');
                    return card && href
                        ? { href, top: card.getBoundingClientRect().top, scrollTop: scroller.scrollTop }
                        : undefined;
                };

                let tracked = firstVisibleCard();
                let largest = 0;
                for (let scrolled = 0; tracked && scrolled < distance; scrolled += step) {
                    scroller.scrollTop += step;
                    // The scroll event lands in one frame and the range it moves is drawn in the next.
                    await nextFrame();
                    await nextFrame();
                    const top = cardTop(tracked.href);
                    if (top === undefined) {
                        return Infinity;
                    }
                    const drift = tracked.top - top - (scroller.scrollTop - tracked.scrollTop);
                    largest = Math.max(largest, Math.abs(drift));
                    if (top < scroller.getBoundingClientRect().top) {
                        tracked = firstVisibleCard();
                    }
                }
                return largest;
            },
            { distance: distancePx, step: stepPx },
        );
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
