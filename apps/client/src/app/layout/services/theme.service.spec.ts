import { PLATFORM_ID } from '@angular/core';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
    let spectator: SpectatorService<ThemeService>;
    const createService = createServiceFactory({
        service: ThemeService,
        providers: [{ provide: PLATFORM_ID, useValue: 'browser' }],
    });

    beforeEach(() => {
        localStorage.clear();
        spectator = createService();
    });

    afterEach(() => {
        localStorage.clear();
        document.documentElement.classList.remove('light-theme', 'dark-theme');
    });

    it('should be created', () => {
        expect(spectator.service).toBeTruthy();
    });

    it('should have default light theme', () => {
        expect(spectator.service.theme()).toBe('light');
    });

    it('should toggle theme from light to dark', () => {
        spectator.service.setTheme('light');
        spectator.service.toggleTheme();
        expect(spectator.service.theme()).toBe('dark');
    });

    it('should toggle theme from dark to light', () => {
        spectator.service.setTheme('dark');
        spectator.service.toggleTheme();
        expect(spectator.service.theme()).toBe('light');
    });

    it('should set theme correctly', () => {
        spectator.service.setTheme('dark');
        expect(spectator.service.theme()).toBe('dark');

        spectator.service.setTheme('light');
        expect(spectator.service.theme()).toBe('light');
    });

    it('should return correct isDark value', () => {
        spectator.service.setTheme('light');
        expect(spectator.service.isDark()).toBe(false);

        spectator.service.setTheme('dark');
        expect(spectator.service.isDark()).toBe(true);
    });
});
