import { createServiceFactory, mockProvider, SpectatorService } from '@ngneat/spectator/jest';
import { StorageService } from '@drevo-web/core';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { AI_THRESHOLDS_STORAGE_KEY, AiThresholdsService, isValidAiThresholds } from './ai-thresholds.service';
import { DEFAULT_AI_THRESHOLDS } from './jev-questionnaire';

describe('AiThresholdsService', () => {
    let spectator: SpectatorService<AiThresholdsService>;
    let storage: jest.Mocked<StorageService>;

    const createService = createServiceFactory({
        service: AiThresholdsService,
        providers: [mockLoggerProvider()],
    });

    const create = (stored: unknown): void => {
        spectator = createService({
            providers: [mockProvider(StorageService, { get: jest.fn().mockReturnValue(stored) })],
        });
        storage = spectator.inject(StorageService);
    };

    it('should read the stored thresholds', () => {
        create({ finding: 0.8, hint: 0.5 });

        expect(spectator.service.thresholds()).toEqual({ finding: 0.8, hint: 0.5 });
        expect(storage.get).toHaveBeenCalledWith(AI_THRESHOLDS_STORAGE_KEY);
    });

    it('should fall back to the defaults when none are stored', () => {
        create(undefined);

        expect(spectator.service.thresholds()).toEqual(DEFAULT_AI_THRESHOLDS);
    });

    it('should fall back to the defaults when the stored value is malformed', () => {
        create({ finding: 0.3, hint: 0.5 });

        expect(spectator.service.thresholds()).toEqual(DEFAULT_AI_THRESHOLDS);
    });

    it('should save valid thresholds', () => {
        create(undefined);

        spectator.service.save({ finding: 0.9, hint: 0.2 });

        expect(storage.set).toHaveBeenCalledWith(AI_THRESHOLDS_STORAGE_KEY, { finding: 0.9, hint: 0.2 });
        expect(spectator.service.thresholds()).toEqual({ finding: 0.9, hint: 0.2 });
    });

    it('should ignore invalid thresholds', () => {
        create(undefined);

        spectator.service.save({ finding: 1.5, hint: 0.2 });

        expect(storage.set).not.toHaveBeenCalled();
        expect(spectator.service.thresholds()).toEqual(DEFAULT_AI_THRESHOLDS);
    });
});

describe('isValidAiThresholds', () => {
    it.each([
        [{ finding: 0.7, hint: 0.4 }, true],
        [{ finding: 0.5, hint: 0.5 }, true],
        [{ finding: 1, hint: 0.01 }, true],
        [{ finding: 1, hint: 0 }, false],
        [{ finding: 0.4, hint: 0.7 }, false],
        [{ finding: 1.1, hint: 0.4 }, false],
        [{ finding: 0.7, hint: -0.1 }, false],
        [{ finding: Number.NaN, hint: 0.4 }, false],
        [{ finding: '0.7', hint: 0.4 }, false],
        [undefined, false],
    ])('should tell %p as %p', (value, expected) => {
        expect(isValidAiThresholds(value)).toBe(expected);
    });
});
