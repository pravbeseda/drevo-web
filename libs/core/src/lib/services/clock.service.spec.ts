import { PLATFORM_ID } from '@angular/core';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { ClockService } from './clock.service';

describe('ClockService', () => {
    const start = new Date(2026, 8, 23, 10, 0, 0);
    const minute = 60 * 1000;

    beforeEach(() => {
        jest.useFakeTimers({ now: start });
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('in the browser', () => {
        let spectator: SpectatorService<ClockService>;
        const createService = createServiceFactory({
            service: ClockService,
            providers: [{ provide: PLATFORM_ID, useValue: 'browser' }],
        });

        beforeEach(() => {
            spectator = createService();
        });

        it('starts at the current moment', () => {
            expect(spectator.service.now()).toEqual(start);
        });

        it('stays put within a minute', () => {
            jest.advanceTimersByTime(minute - 1);

            expect(spectator.service.now()).toEqual(start);
        });

        it('moves on every minute', () => {
            jest.advanceTimersByTime(2 * minute);

            expect(spectator.service.now()).toEqual(new Date(start.getTime() + 2 * minute));
        });
    });

    describe('on the server', () => {
        const createService = createServiceFactory({
            service: ClockService,
            providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
        });

        it('stays at the moment of the render', () => {
            const spectator = createService();

            jest.advanceTimersByTime(2 * minute);

            expect(spectator.service.now()).toEqual(start);
        });
    });
});
