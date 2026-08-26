import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { DayCardComponent } from './day-card.component';

describe('DayCardComponent', () => {
    let spectator: Spectator<DayCardComponent>;
    const createComponent = createComponentFactory(DayCardComponent);

    it('renders the block heading', () => {
        spectator = createComponent();

        expect(spectator.query('[data-testid="day-card-title"]')).toHaveText('Календарь дня');
    });
});
