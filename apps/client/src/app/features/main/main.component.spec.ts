import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';
import { MainComponent } from './main.component';

const BLOCKS = [
    'day-card',
    'month-calendar',
    'site-numbers',
    'article-of-day',
    'latest-articles',
    'popular-articles',
    'sections',
];

describe('MainComponent', () => {
    let spectator: Spectator<MainComponent>;
    const createComponent = createComponentFactory(MainComponent);

    it('should create', () => {
        spectator = createComponent();

        expect(spectator.component).toBeTruthy();
    });

    it.each(BLOCKS)('renders the %s block', block => {
        spectator = createComponent();

        expect(spectator.query(`[data-testid="${block}"]`)).toExist();
    });
});
