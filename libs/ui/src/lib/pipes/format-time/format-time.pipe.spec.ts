import { createPipeFactory, SpectatorPipe } from '@ngneat/spectator/jest';
import { FormatTimePipe } from './format-time.pipe';

describe('FormatTimePipe', () => {
    let spectator: SpectatorPipe<FormatTimePipe>;
    const createPipe = createPipeFactory(FormatTimePipe);

    it('should format a Date object', () => {
        const date = new Date(2025, 0, 15, 14, 5);
        spectator = createPipe(`<span>{{ date | formatTime }}</span>`, {
            hostProps: { date },
        });

        expect(spectator.element.textContent?.trim()).toMatch(/14[:\u2236]05/);
    });

    it('should format a date string', () => {
        spectator = createPipe(`<span>{{ date | formatTime }}</span>`, {
            hostProps: { date: '2025-01-15T14:05:00' },
        });

        expect(spectator.element.textContent?.trim()).toMatch(/14[:\u2236]05/);
    });

    it('should return empty string for undefined', () => {
        spectator = createPipe(`<span>{{ date | formatTime }}</span>`, {
            hostProps: { date: undefined },
        });

        expect(spectator.element.textContent?.trim()).toBe('');
    });
});
