import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { MonthCalendarComponent } from './month-calendar.component';

describe('MonthCalendarComponent', () => {
    let spectator: Spectator<MonthCalendarComponent>;
    const createComponent = createComponentFactory(MonthCalendarComponent);

    it('renders the block heading', () => {
        spectator = createComponent();

        expect(spectator.query('[data-testid="month-calendar-title"]')).toHaveText('Календарь');
    });
});
