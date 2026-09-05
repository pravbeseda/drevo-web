import { ForumSectionsResolveResult } from '../../resolvers/forum-sections.resolver';
import { SectionsPageComponent } from './sections-page.component';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { ForumSection } from '@drevo-web/shared';
import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';
import { of } from 'rxjs';

describe('SectionsPageComponent', () => {
    let spectator: Spectator<SectionsPageComponent>;

    const sections: readonly ForumSection[] = [
        { id: 'common', name: 'Общий', description: 'Обо всём' },
        { id: 'articles', name: 'Статьи', description: 'Обсуждение статей' },
    ];

    const createComponent = createComponentFactory({
        component: SectionsPageComponent,
        providers: [provideRouter([])],
    });

    const render = (result: ForumSectionsResolveResult): void => {
        spectator = createComponent({
            providers: [{ provide: ActivatedRoute, useValue: { data: of({ sections: result }) } }],
        });
    };

    it('lists one entry per section', () => {
        render(sections);

        expect(spectator.queryAll('[data-testid="section-item"]')).toHaveLength(2);
    });

    it('links a section to its topic list', () => {
        render(sections);

        expect(spectator.query('[data-testid="section-link"]')?.getAttribute('href')).toBe('/forum/common');
    });

    it('describes what a section is for', () => {
        render(sections);

        expect(spectator.query('[data-testid="section-description"]')).toHaveText('Обо всём');
    });

    it('shows the load error when the request failed', () => {
        render('load-error');

        const error = spectator.query('[data-testid="sections-load-error"]');
        expect(error).toBeTruthy();
        expect(error?.getAttribute('title')).toBe('Ошибка загрузки');
        expect(error?.getAttribute('message')).toBe(
            'Не удалось загрузить разделы форума. Попробуйте обновить страницу.',
        );
        expect(spectator.queryAll('[data-testid="section-item"]')).toHaveLength(0);
    });
});
