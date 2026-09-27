import { ForumSectionsResolveResult } from '../../resolvers/forum-sections.resolver';
import { ForumPageComponent } from './forum-page.component';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { ForumSection } from '@drevo-web/shared';
import { TabGroupItem } from '@drevo-web/ui';
import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';
import { of } from 'rxjs';

describe('ForumPageComponent', () => {
    let spectator: Spectator<ForumPageComponent>;

    const sections: readonly ForumSection[] = [
        { id: 'common', name: 'Общие темы', description: 'Обо всём' },
        { id: 'articles', name: 'О статьях', description: 'Обсуждение статей' },
        { id: 'news', name: 'О новостях', description: 'Обсуждение новостей' },
    ];

    const allTopicsTab: TabGroupItem = {
        label: 'Все темы',
        route: '/forum',
        icon: 'forum',
        exactRouteMatch: true,
        testId: 'forum-tab-all',
    };

    const createComponent = createComponentFactory({
        component: ForumPageComponent,
        providers: [provideRouter([{ path: '**', children: [] }])],
    });

    const render = (result: ForumSectionsResolveResult): void => {
        spectator = createComponent({
            providers: [{ provide: ActivatedRoute, useValue: { data: of({ sections: result }) } }],
        });
    };

    it('opens every section as a start-aligned tab, «all topics» first', () => {
        render(sections);

        expect(spectator.component.tabGroups()).toEqual([
            {
                items: [
                    allTopicsTab,
                    { label: 'Общие темы', route: '/forum/common', icon: 'chat', testId: 'forum-tab-common' },
                    { label: 'О статьях', route: '/forum/articles', icon: 'article', testId: 'forum-tab-articles' },
                    { label: 'О новостях', route: '/forum/news', icon: 'newspaper', testId: 'forum-tab-news' },
                ],
            },
        ]);
    });

    it('gives a section it has no icon for the generic one', () => {
        render([{ id: 'archive', name: 'Архив', description: '' }]);

        expect(spectator.component.tabGroups()[0]?.items[1]?.icon).toBe('chat');
    });

    it('keeps the forum reachable when the sections failed to load', () => {
        render('load-error');

        expect(spectator.component.tabGroups()).toEqual([{ items: [allTopicsTab] }]);
    });

    it('renders the tabs around the section outlet', () => {
        render(sections);

        expect(spectator.query('ui-tabs-group')).toBeTruthy();
        expect(spectator.query('[data-testid="forum-tab-all"]')).toBeTruthy();
        expect(spectator.query('[data-testid="forum-tab-common"]')?.getAttribute('href')).toBe('/forum/common');
        expect(spectator.query('router-outlet')).toBeTruthy();
    });
});
