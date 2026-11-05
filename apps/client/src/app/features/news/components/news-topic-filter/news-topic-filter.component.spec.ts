import { NewsTopicFilterComponent } from './news-topic-filter.component';
import { provideRouter, Router } from '@angular/router';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { NewsTopic } from '@drevo-web/shared';
import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';

describe('NewsTopicFilterComponent', () => {
    let spectator: Spectator<NewsTopicFilterComponent>;

    const topics: readonly NewsTopic[] = [
        { id: 3, title: 'Церковь' },
        { id: 5, title: 'Общество' },
    ];

    const createComponent = createComponentFactory({
        component: NewsTopicFilterComponent,
        providers: [provideRouter([]), mockLoggerProvider()],
    });

    const render = (current: number | undefined): void => {
        spectator = createComponent({ props: { topics, current } });
    };

    const openMenu = (): Element => {
        spectator.click('[data-testid="news-filter-button"]');
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

    it('names no section while every news item is shown', () => {
        render(undefined);

        expect(spectator.query('[data-testid="news-filter-current"]')).toBeNull();
    });

    it('names the section the feed is narrowed to', () => {
        render(5);

        expect(spectator.query('[data-testid="news-filter-current"]')).toHaveText('Общество');
    });

    it('offers every section first, then each one, ticking the current one', () => {
        render(5);
        const overlay = openMenu();

        const labels = Array.from(overlay.querySelectorAll('[data-testid="news-filter-label"]')).map(label =>
            label.textContent?.trim(),
        );
        expect(labels).toEqual(['Все разделы', 'Церковь', 'Общество']);
        expect(overlay.querySelector('[data-testid="news-filter-5"] ui-icon')).toBeTruthy();
        expect(overlay.querySelector('[data-testid="news-filter-all"] ui-icon')).toBeNull();
    });

    it.each([
        ['news-filter-3', { topic: 3 }],
        ['news-filter-all', { topic: undefined }],
    ])('opens the feed %s names', (testId, queryParams) => {
        render(5);
        const router = spectator.inject(Router);
        jest.spyOn(router, 'navigate').mockResolvedValue(true);
        const overlay = openMenu();

        (overlay.querySelector(`[data-testid="${testId}"]`) as HTMLElement).click();

        expect(router.navigate).toHaveBeenCalledWith(['/news'], { queryParams });
    });
});
