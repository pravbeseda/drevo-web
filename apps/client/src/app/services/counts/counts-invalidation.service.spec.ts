import { CountsInvalidationService } from './counts-invalidation.service';
import { SpectatorService, createServiceFactory } from '@ngneat/spectator/jest';

describe('CountsInvalidationService', () => {
    let spectator: SpectatorService<CountsInvalidationService>;
    const createService = createServiceFactory(CountsInvalidationService);

    beforeEach(() => {
        spectator = createService();
    });

    it('should tell its listeners about each invalidation', () => {
        const listener = jest.fn();
        spectator.service.invalidated$.subscribe(listener);

        spectator.service.invalidate();
        spectator.service.invalidate();

        expect(listener).toHaveBeenCalledTimes(2);
    });
});
