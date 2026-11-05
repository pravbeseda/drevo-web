import { PageSidebarActionsComponent } from '../../../../../../shared/components/page-sidebar-actions/page-sidebar-actions.component';
import { NewsContentTabComponent } from './news-content-tab.component';
import { createMockArticle } from '../../../../../../shared/testing/article-testing.helper';
import { NewsPageService } from '../../../../services/news-page.service';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { ApprovalStatus, ArticleVersion, NewsTopic, NewsMeta, User } from '@drevo-web/shared';
import { createComponentFactory, mockProvider, Spectator } from '@ngneat/spectator/jest';
import { AuthService } from '../../../../../../services/auth/auth.service';
import { createMockUser } from '@drevo-web/shared/testing';
import { ModalService } from '@drevo-web/ui/modal';
import { BehaviorSubject, of } from 'rxjs';
import { NotificationService } from '@drevo-web/core';

describe('NewsContentTabComponent', () => {
    let spectator: Spectator<NewsContentTabComponent>;
    let news: ReturnType<typeof signal<ArticleVersion | undefined>>;
    let sections: ReturnType<typeof signal<readonly NewsTopic[]>>;
    const updateApproval = jest.fn();
    const applyMeta = jest.fn();
    const allTopics = [
        { id: 3, title: 'Церковь' },
        { id: 5, title: 'Общество' },
        { id: 9, title: 'Культура' },
    ];
    let user: BehaviorSubject<User | undefined>;
    const meta: NewsMeta = { articleId: 7, title: 'Другая', newsDate: undefined, topics: [5], rank: 6, numlist: 0 };

    const createComponent = createComponentFactory({
        component: NewsContentTabComponent,
        providers: [provideRouter([]), mockLoggerProvider()],
        detectChanges: false,
    });

    beforeEach(() => {
        news = signal<ArticleVersion | undefined>(
            createMockArticle({
                articleId: 7,
                versionId: 70,
                content: '<p>Текст новости</p>',
                newsDate: new Date(2026, 10, 4),
                title: 'Новость',
                topics: [3],
                rank: 4,
            }),
        );
        sections = signal<readonly NewsTopic[]>([
            { id: 3, title: 'Церковь' },
            { id: 5, title: 'Общество' },
        ]);
        user = new BehaviorSubject<User | undefined>(createMockUser());
        applyMeta.mockReset();
        spectator = createComponent({
            providers: [
                {
                    provide: NewsPageService,
                    useValue: { article: news, sections, topics: signal(allTopics), updateApproval, applyMeta },
                },
                { provide: AuthService, useValue: { user$: user.asObservable() } },
                mockProvider(ModalService, { open: jest.fn(() => of(meta)) }),
                mockProvider(NotificationService),
            ],
        });
    });

    it('shows the text of the news item', () => {
        spectator.detectChanges();

        expect(spectator.query('[data-testid="news-content"]')?.textContent).toContain('Текст новости');
    });

    it('shows the day the news item is about', () => {
        spectator.detectChanges();

        expect(spectator.query('[data-testid="news-date"]')?.textContent?.trim()).toBe('4 ноября 2026');
    });

    it('leaves the date out when the news item has none', () => {
        news.update(current => (current ? { ...current, newsDate: undefined } : current));
        spectator.detectChanges();

        expect(spectator.query('[data-testid="news-date"]')).toBeNull();
    });

    it('names each section of the news item, linking nowhere: there is no feed of a section', () => {
        spectator.detectChanges();

        const sections = spectator.queryAll('[data-testid="news-section"]');
        expect(sections.map(section => section.textContent?.trim())).toEqual(['Церковь', 'Общество']);
        expect(sections.some(section => section.tagName === 'A')).toBe(false);
    });

    it('offers editing and moderating the current version as a news item', () => {
        spectator.detectChanges();

        const actions = spectator.query(PageSidebarActionsComponent);
        expect(actions?.kind()).toBe('news');
        expect(actions?.editUrl()).toBe('/news/7/version/70/edit');
    });

    it('reflects a moderation decision on the news item', () => {
        spectator.detectChanges();

        spectator.query(PageSidebarActionsComponent)?.moderated.emit({
            versionId: 70,
            articleId: 7,
            approved: ApprovalStatus.Approved,
            comment: 'Хорошо',
        });

        expect(updateApproval).toHaveBeenCalledWith(ApprovalStatus.Approved, 'Хорошо');
    });
});
