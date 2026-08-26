import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { ArticleOfDayComponent } from './article-of-day.component';

describe('ArticleOfDayComponent', () => {
    let spectator: Spectator<ArticleOfDayComponent>;
    const createComponent = createComponentFactory(ArticleOfDayComponent);

    it('renders the block heading', () => {
        spectator = createComponent();

        expect(spectator.query('[data-testid="article-of-day-title"]')).toHaveText('Статья дня');
    });
});
