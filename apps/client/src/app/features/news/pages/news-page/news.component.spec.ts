import { NewsComponent } from './news.component';
import { NewsPageService } from '../../services/news-page.service';
import { createMockArticle } from '../../../../shared/testing/article-testing.helper';
import { signal } from '@angular/core';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { ArticleVersion } from '@drevo-web/shared';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { BehaviorSubject } from 'rxjs';

const news = createMockArticle({ articleId: 7, title: 'Новость' });
const topics = [{ id: 3, title: 'Церковь' }];

describe('NewsComponent', () => {
    let spectator: Spectator<NewsComponent>;
    let dataSubject: BehaviorSubject<Record<string, unknown>>;
    let pageService: {
        article: ReturnType<typeof signal<ArticleVersion | undefined>>;
        articleId: ReturnType<typeof signal<number | undefined>>;
        error: ReturnType<typeof signal<string | undefined>>;
        setNews: jest.Mock;
        setError: jest.Mock;
    };

    const createComponent = createComponentFactory({
        component: NewsComponent,
        providers: [provideRouter([{ path: '**', children: [] }]), mockLoggerProvider()],
        detectChanges: false,
    });

    beforeEach(() => {
        dataSubject = new BehaviorSubject<Record<string, unknown>>({ news, topics });
        pageService = {
            article: signal<ArticleVersion | undefined>(news),
            articleId: signal<number | undefined>(7),
            error: signal<string | undefined>(undefined),
            setNews: jest.fn(),
            setError: jest.fn(),
        };
        spectator = createComponent({
            providers: [
                { provide: NewsPageService, useValue: pageService },
                { provide: ActivatedRoute, useValue: { data: dataSubject.asObservable() } },
            ],
        });
    });

    it('hands the resolved news item and the sections to the page', () => {
        spectator.detectChanges();

        expect(pageService.setNews).toHaveBeenCalledWith(news, topics);
    });

    it('reports a news item that did not load', () => {
        dataSubject.next({ news: undefined, topics });
        spectator.detectChanges();

        expect(pageService.setError).toHaveBeenCalledWith('Ошибка загрузки новости');
    });

    it('shows the error instead of the page', () => {
        pageService.error.set('Ошибка загрузки новости');
        pageService.article.set(undefined);
        spectator.detectChanges();

        expect(spectator.query('[data-testid="news-error"]')).toBeTruthy();
        expect(spectator.query('[data-testid="news-page"]')).toBeNull();
    });

    it('offers the news item, its discussions and its versions', () => {
        spectator.detectChanges();

        const [main, end] = spectator.component.tabGroups();
        expect(main.items.map(item => [item.label, item.route])).toEqual([
            ['Новость', '/news/7'],
            ['Обсуждение', '/news/7/forum'],
        ]);
        expect(end.items.map(item => [item.label, item.route])).toEqual([['Версии', '/news/7/history']]);
        expect(end.align).toBe('end');
    });

    it('keeps the news tab active on one of its versions', async () => {
        spectator.detectChanges();
        await spectator.inject(Router).navigateByUrl('/news/7/version/70');

        expect(spectator.component.tabGroups()[0].items[0].isActive?.()).toBe(true);
    });

    it('leaves the news tab on another tab', async () => {
        spectator.detectChanges();
        await spectator.inject(Router).navigateByUrl('/news/7/history');

        expect(spectator.component.tabGroups()[0].items[0].isActive?.()).toBe(false);
    });

    it('offers no tabs before the news item is known', () => {
        pageService.articleId.set(undefined);
        spectator.detectChanges();

        expect(spectator.component.tabGroups()).toEqual([]);
    });
});
