import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { LatestArticlesComponent } from './latest-articles.component';

describe('LatestArticlesComponent', () => {
    let spectator: Spectator<LatestArticlesComponent>;
    const createComponent = createComponentFactory(LatestArticlesComponent);

    it('renders the block heading', () => {
        spectator = createComponent();

        expect(spectator.query('[data-testid="latest-articles-title"]')).toHaveText('Новое');
    });
});
