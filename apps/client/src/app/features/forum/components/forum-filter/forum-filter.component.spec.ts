import { ForumFilterComponent } from './forum-filter.component';
import { provideRouter, Router } from '@angular/router';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { ForumSection } from '@drevo-web/shared';
import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';

describe('ForumFilterComponent', () => {
    let spectator: Spectator<ForumFilterComponent>;

    const sections: readonly ForumSection[] = [
        { id: 'common', name: 'Общие темы', description: 'Обо всём' },
        { id: 'articles', name: 'О статьях', description: 'Обсуждение статей' },
    ];

    const createComponent = createComponentFactory({
        component: ForumFilterComponent,
        providers: [provideRouter([]), mockLoggerProvider()],
    });

    const render = (current: string | undefined): void => {
        spectator = createComponent({ props: { sections, current } });
    };

    const openMenu = (): Element => {
        spectator.click('[data-testid="forum-filter-button"]');
        spectator.detectChanges();
        const overlay = document.querySelector('.cdk-overlay-container');
        if (!overlay) {
            throw new Error('The menu did not open');
        }
        return overlay;
    };

    afterEach(() => {
        document.querySelector('.cdk-overlay-container')?.replaceChildren();
    });

    it('names no section while every topic is shown', () => {
        render(undefined);

        expect(spectator.query('[data-testid="forum-filter-current"]')).toBeNull();
    });

    it('names the section the list is narrowed to', () => {
        render('articles');

        expect(spectator.query('[data-testid="forum-filter-current"]')).toHaveText('О статьях');
    });

    it('offers every topic first, then each section, ticking the current one', () => {
        render('articles');
        const overlay = openMenu();

        const labels = Array.from(overlay.querySelectorAll('[data-testid="forum-filter-label"]')).map(label =>
            label.textContent?.trim(),
        );
        expect(labels).toEqual(['Все темы', 'Общие темы', 'О статьях']);
        expect(overlay.querySelector('[data-testid="forum-filter-articles"] ui-icon')).toBeTruthy();
        expect(overlay.querySelector('[data-testid="forum-filter-all"] ui-icon')).toBeNull();
    });

    it('ticks every topic when no section is picked', () => {
        render(undefined);
        const overlay = openMenu();

        expect(overlay.querySelector('[data-testid="forum-filter-all"] ui-icon')).toBeTruthy();
        expect(overlay.querySelector('[data-testid="forum-filter-common"] ui-icon')).toBeNull();
    });

    it.each([
        ['forum-filter-common', ['/forum', 'common']],
        ['forum-filter-all', ['/forum']],
    ])('opens the list %s names', (testId, commands) => {
        render('articles');
        const router = spectator.inject(Router);
        jest.spyOn(router, 'navigate').mockResolvedValue(true);
        const overlay = openMenu();

        (overlay.querySelector(`[data-testid="${testId}"]`) as HTMLElement).click();

        expect(router.navigate).toHaveBeenCalledWith(commands);
    });
});
