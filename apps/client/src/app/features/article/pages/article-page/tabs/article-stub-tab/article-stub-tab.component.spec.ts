import { ArticleStubTabComponent } from './article-stub-tab.component';
import { ActivatedRoute } from '@angular/router';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { of } from 'rxjs';

describe('ArticleStubTabComponent', () => {
    let spectator: Spectator<ArticleStubTabComponent>;

    const createComponent = createComponentFactory({
        component: ArticleStubTabComponent,
        providers: [
            {
                provide: ActivatedRoute,
                useValue: { data: of({ stubTitle: 'Новости' }) },
            },
        ],
    });

    it('should create', () => {
        spectator = createComponent();
        expect(spectator.component).toBeTruthy();
    });

    it('should display stub title from route data', () => {
        spectator = createComponent();

        expect(spectator.query('.stub')?.textContent).toContain('Новости');
    });

    it('should display construction icon', () => {
        spectator = createComponent();

        expect(spectator.query('ui-icon')).toBeTruthy();
    });

    it('should display different stub title', () => {
        spectator = createComponent({
            providers: [
                {
                    provide: ActivatedRoute,
                    useValue: { data: of({ stubTitle: 'Обсуждение' }) },
                },
            ],
        });

        expect(spectator.query('.stub')?.textContent).toContain('Обсуждение');
    });
});
