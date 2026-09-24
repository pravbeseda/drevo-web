import { test, expect } from '../../fixtures';
import { composite, contrastRatio } from '../../helpers/contrast';
import { LayoutPage } from '../../pages/layout.page';

const THEME_KEY = 'drevo-theme';
const WCAG_AA_TEXT = 4.5;
// A tint this far from the page reads as a marked cell rather than as the page itself.
const MIN_TINT_CONTRAST = 1.15;

const TEXT = ['--themed-text-primary', '--themed-text-secondary', '--themed-text-muted'];
const SURFACES = ['--themed-primary-bg', '--themed-secondary-bg'];
const PAGE_LINKS = [
    '--themed-link-color',
    '--themed-wiki-existlink',
    '--themed-wiki-newlink',
    '--themed-wiki-note-link',
    '--themed-wiki-external-link',
    '--themed-wiki-verse',
];
const CALENDAR_DAYS = ['--themed-calendar-feast', '--themed-calendar-weekend'];
// Material components paint from these, so they must agree with the app's own tokens.
const MATERIAL_TO_THEMED: readonly (readonly [string, string])[] = [
    ['--mat-sys-surface', '--themed-primary-bg'],
    ['--mat-sys-surface-container-high', '--themed-secondary-bg'],
    ['--mat-sys-on-surface', '--themed-text-primary'],
    ['--mat-sys-outline-variant', '--themed-border-color'],
];

test.describe('Light theme palette', () => {
    let layout: LayoutPage;

    test.beforeEach(async ({ authenticatedPage: page }) => {
        layout = new LayoutPage(page);
        await page.goto('/');
        await layout.waitForReady();
        await layout.expectLightTheme();
    });

    test('text meets WCAG AA on the page and on panels', async () => {
        const colors = await layout.readColors([...TEXT, ...SURFACES]);

        for (const text of TEXT) {
            for (const surface of SURFACES) {
                expect(contrastRatio(colors[text], colors[surface]), `${text} on ${surface}`).toBeGreaterThanOrEqual(
                    WCAG_AA_TEXT,
                );
            }
        }
    });

    test('links meet WCAG AA on the page', async () => {
        const colors = await layout.readColors([...PAGE_LINKS, '--themed-primary-bg']);

        for (const link of PAGE_LINKS) {
            expect(contrastRatio(colors[link], colors['--themed-primary-bg']), link).toBeGreaterThanOrEqual(
                WCAG_AA_TEXT,
            );
        }
    });

    test('calendar day numbers meet WCAG AA on the page', async () => {
        const colors = await layout.readColors([...CALENDAR_DAYS, '--themed-primary-bg']);

        for (const day of CALENDAR_DAYS) {
            expect(contrastRatio(colors[day], colors['--themed-primary-bg']), day).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
        }
    });

    test('fast days stand out from the page', async () => {
        const colors = await layout.readColors(['--themed-calendar-fast-bg', '--themed-primary-bg']);
        const page = colors['--themed-primary-bg'];

        expect(contrastRatio(composite(colors['--themed-calendar-fast-bg'], page), page)).toBeGreaterThanOrEqual(
            MIN_TINT_CONTRAST,
        );
    });

    test('Material surfaces follow the themed palette', async () => {
        const colors = await layout.readColors(MATERIAL_TO_THEMED.flat());

        for (const [material, themed] of MATERIAL_TO_THEMED) {
            expect(colors[material], `${material} vs ${themed}`).toBe(colors[themed]);
        }
    });
});

test.describe('Theme toggle', () => {
    let layout: LayoutPage;

    test.describe('Toggle', () => {
        test.beforeEach(async ({ authenticatedPage: page }) => {
            layout = new LayoutPage(page);
            await page.goto('/');
            await layout.waitForReady();
        });

        test('applies dark theme on click', async () => {
            await layout.themeToggle.click();
            await layout.expectDarkTheme();
        });

        test('returns to light theme on second click', async () => {
            await layout.themeToggle.click();
            await layout.themeToggle.click();
            await layout.expectLightTheme();
        });
    });

    test.describe('Persistence', () => {
        test('saves dark theme to localStorage', async ({ authenticatedPage: page }) => {
            layout = new LayoutPage(page);
            await page.goto('/');
            await layout.waitForReady();

            await layout.themeToggle.click();
            // ThemeService uses an effect() that is async in zoneless mode.
            // Wait for the DOM class change (same effect) before reading localStorage.
            await layout.expectDarkTheme();

            const value = await page.evaluate(key => localStorage.getItem(key), THEME_KEY);
            expect(value).toBe('dark');
        });

        test('restores dark theme from localStorage', async ({ authenticatedPage: page }) => {
            await page.addInitScript(key => {
                localStorage.setItem(key, 'dark');
            }, THEME_KEY);

            layout = new LayoutPage(page);
            await page.goto('/');
            await layout.waitForReady();

            await layout.expectDarkTheme();
        });
    });
});
