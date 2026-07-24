import { ArticleMissingTabComponent } from './article-missing-tab.component';
import { ArticlePageService } from '../../../../services/article-page.service';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';

function createMockPageService(overrides: { canCreate?: boolean; reason?: string } = {}) {
    const canCreate = overrides.canCreate ?? true;
    return {
        title: signal('НОВАЯ СТАТЬЯ'),
        canCreate: signal(canCreate),
        createUrl: signal(canCreate ? '/articles/find/НОВАЯ СТАТЬЯ/edit' : undefined),
        missing: signal({ articleId: 0, title: 'НОВАЯ СТАТЬЯ', canCreate, reason: overrides.reason }),
    };
}

describe('ArticleMissingTabComponent', () => {
    let spectator: Spectator<ArticleMissingTabComponent>;

    const createComponent = createComponentFactory({
        component: ArticleMissingTabComponent,
        providers: [provideRouter([{ path: '**', children: [] }])],
    });

    it('should render the missing article message', () => {
        spectator = createComponent({
            providers: [{ provide: ArticlePageService, useValue: createMockPageService() }],
        });

        expect(spectator.query('[data-testid="article-missing"]')?.textContent).toContain(
            'Статьи «НОВАЯ СТАТЬЯ» пока не существует',
        );
    });

    it('should render the create button with the create route', () => {
        spectator = createComponent({
            providers: [{ provide: ArticlePageService, useValue: createMockPageService() }],
        });

        const href = spectator.query('[data-testid="create-article-action"]')?.getAttribute('href');
        expect(href).toBeTruthy();
        expect(decodeURIComponent(href ?? '')).toBe('/articles/find/НОВАЯ СТАТЬЯ/edit');
    });

    it('should show the reason instead of the button when creation is denied', () => {
        spectator = createComponent({
            providers: [
                {
                    provide: ArticlePageService,
                    useValue: createMockPageService({
                        canCreate: false,
                        reason: 'Недостаточно прав для создания статей',
                    }),
                },
            ],
        });

        expect(spectator.query('[data-testid="create-article-action"]')).toBeFalsy();
        expect(spectator.query('[data-testid="create-article-denied"]')?.textContent).toContain(
            'Недостаточно прав для создания статей',
        );
    });
});
