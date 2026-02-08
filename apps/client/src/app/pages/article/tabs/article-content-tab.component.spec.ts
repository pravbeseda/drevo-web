import { ArticlePageService } from '../article-page.service';
import { ArticleContentTabComponent } from './article-content-tab.component';
import { ActivatedRoute } from '@angular/router';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { signal } from '@angular/core';
import { ArticleVersion } from '@drevo-web/shared';
import { of } from 'rxjs';

const mockArticle: ArticleVersion = {
    articleId: 123,
    versionId: 456,
    title: 'Test Article',
    content: '<p>Test content</p>',
    author: 'Author',
    date: new Date('2024-01-15'),
    redirect: false,
    new: false,
    approved: 1,
    info: '',
    comment: '',
};

describe('ArticleContentTabComponent', () => {
    let spectator: Spectator<ArticleContentTabComponent>;

    const createComponent = createComponentFactory({
        component: ArticleContentTabComponent,
        providers: [
            {
                provide: ArticlePageService,
                useValue: {
                    article: signal(mockArticle),
                },
            },
            {
                provide: ActivatedRoute,
                useValue: { fragment: of(undefined) },
            },
        ],
    });

    it('should create', () => {
        spectator = createComponent();
        expect(spectator.component).toBeTruthy();
    });

    it('should render article-content component', () => {
        spectator = createComponent();
        expect(spectator.query('app-article-content')).toBeTruthy();
    });

    it('should not render content when article is undefined', () => {
        spectator = createComponent({
            providers: [
                {
                    provide: ArticlePageService,
                    useValue: { article: signal(undefined) },
                },
                {
                    provide: ActivatedRoute,
                    useValue: { fragment: of(undefined) },
                },
            ],
        });
        expect(spectator.query('app-article-content')).toBeFalsy();
    });
});
