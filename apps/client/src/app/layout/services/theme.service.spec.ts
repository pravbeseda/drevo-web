import { PLATFORM_ID } from '@angular/core';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { WINDOW } from '@drevo-web/core';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { ThemeService } from './theme.service';

const THEME_KEY = 'drevo-theme';

describe('ThemeService', () => {
    let spectator: SpectatorService<ThemeService>;
    let prefersDark: boolean;

    const fakeWindow = {
        localStorage: window.localStorage,
        matchMedia: (query: string) => ({ matches: prefersDark, media: query, addEventListener: jest.fn() }),
    };

    const createService = createServiceFactory({
        service: ThemeService,
        providers: [
            { provide: PLATFORM_ID, useValue: 'browser' },
            { provide: WINDOW, useValue: fakeWindow },
            mockLoggerProvider(),
        ],
    });

    beforeEach(() => {
        localStorage.clear();
        prefersDark = false;
    });

    afterEach(() => {
        jest.restoreAllMocks();
        localStorage.clear();
        document.documentElement.classList.remove('light-theme', 'dark-theme');
        document.documentElement.style.colorScheme = '';
    });

    describe('initial theme', () => {
        it('follows the system preference when nothing is saved', () => {
            prefersDark = true;
            spectator = createService();

            expect(spectator.service.theme()).toBe('dark');
        });

        it('restores a theme saved as a raw string over the system preference', () => {
            prefersDark = true;
            localStorage.setItem(THEME_KEY, 'light');
            spectator = createService();

            expect(spectator.service.theme()).toBe('light');
        });
    });

    describe('switching', () => {
        beforeEach(() => {
            spectator = createService();
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

        it('applies the theme to the document root', () => {
            spectator.service.setTheme('dark');
            spectator.flushEffects();

            const root = document.documentElement;
            expect(root.classList).toContain('dark-theme');
            expect(root.classList).not.toContain('light-theme');
            expect(root.style.colorScheme).toBe('dark');
        });

        it('saves the theme as a raw string', () => {
            spectator.service.setTheme('dark');
            spectator.flushEffects();

            expect(localStorage.getItem(THEME_KEY)).toBe('dark');
        });

        it('keeps working when the theme cannot be saved', () => {
            jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
                throw new DOMException('Storage is full', 'QuotaExceededError');
            });
            spectator.service.setTheme('dark');

            expect(() => spectator.flushEffects()).not.toThrow();
            expect(document.documentElement.classList).toContain('dark-theme');
        });
    });
});
