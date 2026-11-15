import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { computed, effect, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { StorageService, WINDOW } from '@drevo-web/core';

export type Theme = 'light' | 'dark';

const THEME_KEY = 'drevo-theme';
const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';

@Injectable({
    providedIn: 'root',
})
export class ThemeService {
    private readonly platformId = inject(PLATFORM_ID);
    private readonly isBrowser = isPlatformBrowser(this.platformId);
    private readonly storage = inject(StorageService);
    private readonly window = inject(WINDOW);
    private readonly document = inject(DOCUMENT);

    private readonly _theme = signal<Theme>(this.getInitialTheme());
    readonly theme = this._theme.asReadonly();
    readonly isDark = computed(() => this._theme() === 'dark');

    constructor() {
        effect(() => {
            const currentTheme = this._theme();
            if (this.isBrowser) {
                this.applyTheme(currentTheme);
                // Raw string, not JSON: themes saved before StorageService must still be read.
                this.storage.setString(THEME_KEY, currentTheme);
            }
        });

        this.listenToSystemThemeChanges();
    }

    toggleTheme(): void {
        this._theme.update(current => (current === 'light' ? 'dark' : 'light'));
    }

    setTheme(theme: Theme): void {
        this._theme.set(theme);
    }

    private getInitialTheme(): Theme {
        const savedTheme = this.storage.getString(THEME_KEY);
        if (savedTheme === 'light' || savedTheme === 'dark') {
            return savedTheme;
        }

        return this.getSystemTheme();
    }

    private getSystemTheme(): Theme {
        return this.window?.matchMedia(DARK_SCHEME_QUERY).matches ? 'dark' : 'light';
    }

    private applyTheme(theme: Theme): void {
        const root = this.document.documentElement;

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

    private listenToSystemThemeChanges(): void {
        this.window?.matchMedia(DARK_SCHEME_QUERY).addEventListener('change', e => {
            // Apply system theme only if user hasn't explicitly chosen one
            if (!this.storage.getString(THEME_KEY)) {
                this._theme.set(e.matches ? 'dark' : 'light');
            }
        });
    }
}
