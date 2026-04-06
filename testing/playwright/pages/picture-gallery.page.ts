import { BasePage } from './base.page';

export class PictureGalleryPage extends BasePage {
    readonly page_ = this.page;
    readonly root = this.page.getByTestId('pictures-page');
    readonly searchBar = this.page.getByTestId('pictures-search-bar');
    readonly searchInput = this.searchBar.locator('input');
    readonly loading = this.page.getByTestId('pictures-loading');
    readonly gallery = this.page.getByTestId('pictures-gallery');
    readonly empty = this.page.getByTestId('pictures-empty');
    readonly cards = this.page.getByTestId('picture-card');

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
}
