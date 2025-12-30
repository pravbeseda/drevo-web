import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
    let service: ThemeService;

    beforeEach(() => {
        localStorage.clear();

        TestBed.configureTestingModule({
            providers: [{ provide: PLATFORM_ID, useValue: 'browser' }],
        });
        service = TestBed.inject(ThemeService);
    });

    afterEach(() => {
        localStorage.clear();
        document.documentElement.classList.remove('light-theme', 'dark-theme');
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should have default light theme', () => {
        expect(service.theme()).toBe('light');
    });

    it('should toggle theme from light to dark', () => {
        service.setTheme('light');
        service.toggleTheme();
        expect(service.theme()).toBe('dark');
    });

    it('should toggle theme from dark to light', () => {
        service.setTheme('dark');
        service.toggleTheme();
        expect(service.theme()).toBe('light');
    });

    it('should set theme correctly', () => {
        service.setTheme('dark');
        expect(service.theme()).toBe('dark');

        service.setTheme('light');
        expect(service.theme()).toBe('light');
    });

    it('should return correct isDark value', () => {
        service.setTheme('light');
        expect(service.isDark()).toBe(false);

        service.setTheme('dark');
        expect(service.isDark()).toBe(true);
    });
});
