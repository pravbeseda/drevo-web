import { createPipeFactory, SpectatorPipe } from '@ngneat/spectator/jest';
import { FormatDatePipe } from './format-date.pipe';

describe('FormatDatePipe', () => {
    let spectator: SpectatorPipe<FormatDatePipe>;
    const createPipe = createPipeFactory(FormatDatePipe);

    it('should format a Date object as "day month year, HH:MM"', () => {
        const date = new Date(2025, 0, 15, 14, 30);
        spectator = createPipe(`<span>{{ date | formatDate }}</span>`, {
            hostProps: { date },
        });

        expect(spectator.element.textContent?.trim()).toBe('15 января 2025, 14:30');
    });

    it('should return empty string for undefined', () => {
        spectator = createPipe(`<span>{{ date | formatDate }}</span>`, {
            hostProps: { date: undefined },
        });

        expect(spectator.element.textContent?.trim()).toBe('');
    });
});
