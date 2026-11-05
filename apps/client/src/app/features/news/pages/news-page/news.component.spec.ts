import { NewsComponent } from './news.component';
import { NewsPageService } from '../../services/news-page.service';
import { createMockArticle } from '../../../../shared/testing/article-testing.helper';
import { signal } from '@angular/core';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { ArticleVersion, NewsMeta, User } from '@drevo-web/shared';
import { createComponentFactory, Spectator, mockProvider } from '@ngneat/spectator/jest';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { AuthService } from '../../../../services/auth/auth.service';
import { NewsService } from '../../../../services/news/news.service';
import { NewsTopicSidebarActionComponent } from '../../../../shared/components/news-topic-sidebar-action/news-topic-sidebar-action.component';
import { SidebarActionComponent } from '../../../../shared/components/sidebar-action/sidebar-action.component';
import { NewsMetaDialogComponent } from '../../components/news-meta-dialog/news-meta-dialog.component';
import { NotificationService } from '@drevo-web/core';
import { createMockUser } from '@drevo-web/shared/testing';
import { ModalService } from '@drevo-web/ui/modal';

const news = createMockArticle({
    articleId: 7,
    title: 'Новость',
    topics: [3],
    rank: 4,
    newsDate: new Date(2026, 10, 4),
});
const meta: NewsMeta = { articleId: 7, title: 'Другая', newsDate: undefined, topics: [5], rank: 6, numlist: 0 };
const moderator = (): User => createMockUser({ role: 'moder', permissions: { canModerate: true } });
const topics = [{ id: 3, title: 'Церковь' }];

describe('NewsComponent', () => {
    let spectator: Spectator<NewsComponent>;
    let dataSubject: BehaviorSubject<Record<string, unknown>>;
    let pageService: {
        article: ReturnType<typeof signal<ArticleVersion | undefined>>;
        articleId: ReturnType<typeof signal<number | undefined>>;
        error: ReturnType<typeof signal<string | undefined>>;
        topics: ReturnType<typeof signal<readonly { id: number; title: string }[]>>;
        setNews: jest.Mock;
        setError: jest.Mock;
        applyMeta: jest.Mock;
    };
    let user: BehaviorSubject<User | undefined>;
    let newsService: { updateMeta: jest.Mock };

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
            topics: signal(topics),
            setNews: jest.fn(),
            setError: jest.fn(),
            applyMeta: jest.fn(),
        };
        user = new BehaviorSubject<User | undefined>(createMockUser());
        spectator = createComponent({
            providers: [
                { provide: NewsPageService, useValue: pageService },
                { provide: ActivatedRoute, useValue: { data: dataSubject.asObservable() } },
                { provide: AuthService, useValue: { user$: user.asObservable() } },
                mockProvider(ModalService, { open: jest.fn(() => of(meta)) }),
                mockProvider(NewsService, { updateMeta: jest.fn(() => of(meta)) }),
                mockProvider(NotificationService),
            ],
        });
        newsService = spectator.inject(NewsService);
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

    describe("the section and the meta, a moderator's", () => {
        const sectionAction = (): NewsTopicSidebarActionComponent | null =>
            spectator.query(NewsTopicSidebarActionComponent);
        const metaAction = (): SidebarActionComponent | undefined =>
            spectator.queryAll(SidebarActionComponent).find(action => action.label() === 'Свойства новости');
        const at = async (url: string): Promise<void> => {
            spectator.detectChanges();
            await spectator.inject(Router).navigateByUrl(url);
            spectator.detectChanges();
        };

        it('are not offered to a reader who does not moderate', async () => {
            await at('/news/7');

            expect(sectionAction()).toBeNull();
            expect(metaAction()).toBeUndefined();
        });

        it('are offered on the news item and on any of its versions', async () => {
            user.next(moderator());

            await at('/news/7');
            expect(sectionAction()?.selected()).toBe(3);
            expect(metaAction()).toBeDefined();

            await at('/news/7/version/70');
            expect(sectionAction()?.topics()).toEqual(topics);
            expect(metaAction()).toBeDefined();
        });

        it('are not offered in the editor, nor on the other tabs', async () => {
            user.next(moderator());

            await at('/news/7/version/70/edit');
            expect(sectionAction()).toBeNull();

            await at('/news/7/history');
            expect(metaAction()).toBeUndefined();
        });

        it('saves the picked section and takes what the news item now holds', async () => {
            user.next(moderator());
            await at('/news/7');

            sectionAction()?.picked.emit(5);

            expect(newsService.updateMeta).toHaveBeenCalledWith(7, { topic: 5 });
            expect(pageService.applyMeta).toHaveBeenCalledWith(meta);
            expect(spectator.inject(NotificationService).success).toHaveBeenCalledWith('Раздел сохранён');
        });

        it('says so when the section is not saved', async () => {
            newsService.updateMeta.mockReturnValue(throwError(() => new Error('down')));
            user.next(moderator());
            await at('/news/7');

            sectionAction()?.picked.emit(5);

            expect(pageService.applyMeta).not.toHaveBeenCalled();
            expect(spectator.inject(NotificationService).error).toHaveBeenCalledWith('Не удалось сохранить раздел');
        });

        it('opens the meta form filled with what the news item has, and takes what is saved', async () => {
            user.next(moderator());
            await at('/news/7');

            metaAction()?.activated.emit();

            const open = jest.mocked(spectator.inject(ModalService).open);
            expect(open).toHaveBeenCalledWith(expect.any(Function), {
                data: { newsId: 7, fields: { title: 'Новость', newsDate: '2026-11-04', topic: 3 }, rank: 4 },
            });
            await expect(open.mock.calls[0][0]()).resolves.toBe(NewsMetaDialogComponent);
            expect(pageService.applyMeta).toHaveBeenCalledWith(meta);
        });
    });
});
