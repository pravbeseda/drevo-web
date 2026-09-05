import { ForumSectionsResolveResult } from '../../resolvers/forum-sections.resolver';
import { ForumPageComponent } from './forum-page.component';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { ForumSection } from '@drevo-web/shared';
import { TabItem } from '@drevo-web/ui';
import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';
import { of } from 'rxjs';

describe('ForumPageComponent', () => {
    let spectator: Spectator<ForumPageComponent>;

    const sections: readonly ForumSection[] = [
        { id: 'common', name: 'Общие темы', description: 'Обо всём' },
        { id: 'articles', name: 'О статьях', description: 'Обсуждение статей' },
    ];

    const allTopicsTab: TabItem = { label: 'Все темы', route: '/forum', exact: true, testId: 'forum-tab-all' };

    const createComponent = createComponentFactory({
        component: ForumPageComponent,
        providers: [provideRouter([{ path: '**', children: [] }])],
    });

    const render = (result: ForumSectionsResolveResult): void => {
        spectator = createComponent({
            providers: [{ provide: ActivatedRoute, useValue: { data: of({ sections: result }) } }],
        });
    };

    it('opens every section as a tab, «all topics» first', () => {
        render(sections);

        expect(spectator.component.tabs()).toEqual([
            allTopicsTab,
            {
                label: 'Общие темы',
                route: '/forum/common',
                tooltip: 'Обо всём',
                testId: 'forum-tab-common',
            },
            {
                label: 'О статьях',
                route: '/forum/articles',
                tooltip: 'Обсуждение статей',
                testId: 'forum-tab-articles',
            },
        ]);
    });

    it('keeps the forum reachable when the sections failed to load', () => {
        render('load-error');

        expect(spectator.component.tabs()).toEqual([allTopicsTab]);
    });

    it('renders the tabs around the section outlet', () => {
        render(sections);

        expect(spectator.query('[data-testid="forum-tab-all"]')).toBeTruthy();
        expect(spectator.query('[data-testid="forum-tab-common"]')?.getAttribute('href')).toBe('/forum/common');
        expect(spectator.query('router-outlet')).toBeTruthy();
    });
});
