import { createPipeFactory, SpectatorPipe } from '@ngneat/spectator/jest';
import { RelativeTimePipe } from './relative-time.pipe';

describe('RelativeTimePipe', () => {
    let spectator: SpectatorPipe<RelativeTimePipe>;
    const createPipe = createPipeFactory(RelativeTimePipe);

    const now = new Date(2026, 8, 23, 10, 0);

    function render(date: Date | undefined, at = now): string | undefined {
        spectator = createPipe(`<span>{{ date | relativeTime: now }}</span>`, {
            hostProps: { date, now: at },
        });
        return spectator.element.textContent?.trim();
    }

    it('tells how long ago the date was, as of the given moment', () => {
        expect(render(new Date(2026, 8, 23, 9, 55))).toBe('5 мин. назад');
    });

    it('follows the moment as it moves', () => {
        render(new Date(2026, 8, 23, 9, 55));

        spectator.setHostInput({ now: new Date(2026, 8, 23, 11, 0) });

        expect(spectator.element.textContent?.trim()).toBe('1 ч назад');
    });

    it('renders nothing without a date', () => {
        expect(render(undefined)).toBe('');
    });
});
