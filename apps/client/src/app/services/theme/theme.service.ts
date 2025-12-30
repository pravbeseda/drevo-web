import { Injectable, signal, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type Theme = 'light' | 'dark';

const THEME_KEY = 'drevo-theme';

@Injectable({
    providedIn: 'root',
})
export class ThemeService {
    private readonly platformId = inject(PLATFORM_ID);
    private readonly isBrowser = isPlatformBrowser(this.platformId);

    readonly theme = signal<Theme>(this.getInitialTheme());
    readonly isDark = () => this.theme() === 'dark';

    constructor() {
        effect(() => {
            const currentTheme = this.theme();
            if (this.isBrowser) {
                this.applyTheme(currentTheme);
                this.saveTheme(currentTheme);
            }
        });

        if (this.isBrowser) {
            this.listenToSystemThemeChanges();
        }
    }

    toggleTheme(): void {
        this.theme.update(current => (current === 'light' ? 'dark' : 'light'));
    }

    setTheme(theme: Theme): void {
        this.theme.set(theme);
    }

    private getInitialTheme(): Theme {
        if (!this.isBrowser) {
            return 'light';
        }

        const savedTheme = localStorage.getItem(THEME_KEY) as Theme | null;
        if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
            return savedTheme;
        }

        return this.getSystemTheme();
    }

    private getSystemTheme(): Theme {
        if (
            this.isBrowser &&
            window.matchMedia('(prefers-color-scheme: dark)').matches
        ) {
            return 'dark';
        }
        return 'light';
    }

    private applyTheme(theme: Theme): void {
        const root = document.documentElement;

        if (theme === 'dark') {
            root.classList.add('dark-theme');
            root.classList.remove('light-theme');
            root.style.colorScheme = 'dark';
        } else {
            root.classList.add('light-theme');
            root.classList.remove('dark-theme');
            root.style.colorScheme = 'light';
        }
    }

    private saveTheme(theme: Theme): void {
        localStorage.setItem(THEME_KEY, theme);
    }

    private listenToSystemThemeChanges(): void {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        mediaQuery.addEventListener('change', e => {
            // Apply system theme only if user hasn't explicitly chosen one
            const savedTheme = localStorage.getItem(THEME_KEY);
            if (!savedTheme) {
                this.theme.set(e.matches ? 'dark' : 'light');
            }
        });
    }
}
