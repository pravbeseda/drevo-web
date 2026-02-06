import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { MockProvider } from 'ng-mocks';
import { StorageService } from '@drevo-web/core';
import { FontScaleService, FONT_SCALE_KEY } from './font-scale.service';

describe('FontScaleService', () => {
    let spectator: SpectatorService<FontScaleService>;
    let storageService: StorageService;

    const createService = createServiceFactory({
        service: FontScaleService,
        providers: [
            { provide: PLATFORM_ID, useValue: 'browser' },
            MockProvider(StorageService, {
                get: jest.fn(),
                set: jest.fn(),
                remove: jest.fn(),
            }),
        ],
    });

    beforeEach(() => {
        document.documentElement.style.fontSize = '';
        spectator = createService();
        storageService = spectator.inject(StorageService);
    });

    afterEach(() => {
        document.documentElement.style.fontSize = '';
    });

    it('should be created', () => {
        expect(spectator.service).toBeTruthy();
    });

    it('should have default scale of 1 (100%)', () => {
        expect(spectator.service.scale()).toBe(1);
        expect(spectator.service.scalePercent()).toBe(100);
    });

    it('should increase scale by 10%', () => {
        spectator.service.increase();
        expect(spectator.service.scale()).toBe(1.1);
        expect(spectator.service.scalePercent()).toBe(110);
    });

    it('should decrease scale by 10%', () => {
        spectator.service.increase();
        spectator.service.decrease();
        expect(spectator.service.scale()).toBe(1);
        expect(spectator.service.scalePercent()).toBe(100);
    });

    it('should not decrease below minimum scale (80%)', () => {
        spectator.service.decrease();
        spectator.service.decrease();
        spectator.service.decrease();
        expect(spectator.service.scale()).toBe(0.8);
        expect(spectator.service.canDecrease()).toBe(false);
    });

    it('should not increase above maximum scale (150%)', () => {
        for (let i = 0; i < 10; i++) {
            spectator.service.increase();
        }
        expect(spectator.service.scale()).toBe(1.5);
        expect(spectator.service.canIncrease()).toBe(false);
    });

    it('should reset to default scale', () => {
        spectator.service.increase();
        spectator.service.increase();
        expect(spectator.service.scale()).toBe(1.2);

        spectator.service.reset();
        expect(spectator.service.scale()).toBe(1);
        expect(spectator.service.isDefault()).toBe(true);
    });

    it('should report isDefault correctly', () => {
        expect(spectator.service.isDefault()).toBe(true);

        spectator.service.increase();
        expect(spectator.service.isDefault()).toBe(false);

        spectator.service.reset();
        expect(spectator.service.isDefault()).toBe(true);
    });

    it('should report canIncrease correctly', () => {
        expect(spectator.service.canIncrease()).toBe(true);

        for (let i = 0; i < 5; i++) {
            spectator.service.increase();
        }
        expect(spectator.service.scale()).toBe(1.5);
        expect(spectator.service.canIncrease()).toBe(false);
    });

    it('should report canDecrease correctly', () => {
        expect(spectator.service.canDecrease()).toBe(true);

        spectator.service.decrease();
        spectator.service.decrease();
        expect(spectator.service.scale()).toBe(0.8);
        expect(spectator.service.canDecrease()).toBe(false);
    });

    it('should apply scale to document font size', () => {
        spectator.service.increase();
        TestBed.flushEffects();
        expect(parseFloat(document.documentElement.style.fontSize)).toBeCloseTo(
            15.4
        );
    });

    it('should save scale to storage', () => {
        spectator.service.increase();
        TestBed.flushEffects();
        expect(storageService.set).toHaveBeenCalledWith(FONT_SCALE_KEY, 1.1);
    });

    it('should remove from storage when reset to default', () => {
        spectator.service.increase();
        TestBed.flushEffects();

        spectator.service.reset();
        TestBed.flushEffects();
        expect(storageService.remove).toHaveBeenCalledWith(FONT_SCALE_KEY);
    });
});

describe('FontScaleService with saved scale', () => {
    let spectator: SpectatorService<FontScaleService>;

    const createService = createServiceFactory({
        service: FontScaleService,
        providers: [{ provide: PLATFORM_ID, useValue: 'browser' }],
    });

    afterEach(() => {
        document.documentElement.style.fontSize = '';
    });

    it('should restore scale from storage', () => {
        spectator = createService({
            providers: [
                MockProvider(StorageService, {
                    get: jest.fn().mockReturnValue(1.2),
                }),
            ],
        });

        expect(spectator.service.scale()).toBe(1.2);
        expect(spectator.service.scalePercent()).toBe(120);
    });

    it('should use default for undefined storage value', () => {
        spectator = createService({
            providers: [
                MockProvider(StorageService, {
                    get: jest.fn().mockReturnValue(undefined),
                }),
            ],
        });

        expect(spectator.service.scale()).toBe(1);
    });

    it('should use default for out-of-range storage value', () => {
        spectator = createService({
            providers: [
                MockProvider(StorageService, {
                    get: jest.fn().mockReturnValue(2.0),
                }),
            ],
        });

        expect(spectator.service.scale()).toBe(1);
    });
});
