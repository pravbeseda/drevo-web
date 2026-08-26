import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { PopularArticlesComponent } from './popular-articles.component';

describe('PopularArticlesComponent', () => {
    let spectator: Spectator<PopularArticlesComponent>;
    const createComponent = createComponentFactory(PopularArticlesComponent);

    it('renders the block heading', () => {
        spectator = createComponent();

        expect(spectator.query('[data-testid="popular-articles-title"]')).toHaveText('Популярное');
    });
});
