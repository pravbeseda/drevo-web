import { createPipeFactory, SpectatorPipe } from '@ngneat/spectator/jest';
import { FormatDatePipe } from './format-date.pipe';

describe('FormatDatePipe', () => {
    let spectator: SpectatorPipe<FormatDatePipe>;
    const createPipe = createPipeFactory(FormatDatePipe);

    it('should format a Date object in Russian locale', () => {
        const date = new Date(2025, 0, 15, 14, 30);
        spectator = createPipe(`<span>{{ date | formatDate }}</span>`, {
            hostProps: { date },
        });

        const text = spectator.element.textContent?.trim() ?? '';
        expect(text).toContain('2025');
        expect(text).toMatch(/14[:\u2236]30/);
    });

    it('should return empty string for undefined', () => {
        spectator = createPipe(`<span>{{ date | formatDate }}</span>`, {
            hostProps: { date: undefined },
        });

        expect(spectator.element.textContent?.trim()).toBe('');
    });
});
