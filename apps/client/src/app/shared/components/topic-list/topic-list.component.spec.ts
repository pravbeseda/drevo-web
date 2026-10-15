import { TopicListComponent } from './topic-list.component';
import { AuthService } from '../../../services/auth/auth.service';
import { mockForumDraftProvider } from '../../../services/forum/forum-draft.testing';
import { TopicListLoadState } from '../../services/topic-list-pages/topic-list-pages.service';
import { Component } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { ForumTopicListItem, User } from '@drevo-web/shared';
import { createMockUser } from '@drevo-web/shared/testing';
import { VirtualScrollerComponent } from '@drevo-web/ui';
import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';
import { of } from 'rxjs';

jest.mock('overlayscrollbars', () => ({ OverlayScrollbars: jest.fn(() => ({ destroy: jest.fn() })) }));

function createItem(overrides: Partial<ForumTopicListItem> = {}): ForumTopicListItem {
    return {
        id: 7,
        title: 'Первая тема',
        lastPostAt: new Date('2025-03-16T12:30:00Z'),
        pinned: false,
        author: 'Петров Пётр Петрович',
        lastExcerpt: undefined,
        lastAuthorLogin: undefined,
        article: { id: 15, title: 'Статья' },
        section: { id: 'articles', name: 'О статьях' },
        ...overrides,
    };
}

@Component({ template: '' })
class BlankComponent {}

describe('TopicListComponent', () => {
    let spectator: Spectator<TopicListComponent>;

    const createComponent = createComponentFactory({
        component: TopicListComponent,
        providers: [provideRouter([{ path: '**', component: BlankComponent }]), mockLoggerProvider()],
    });

    const settle = async (): Promise<void> => {
        await spectator.fixture.whenStable();
        spectator.detectChanges();
    };

    /** The viewport measures itself in one render and draws its first rows in the next. */
    const render = async (
        items: readonly ForumTopicListItem[],
        props: {
            readonly relativeLinks?: boolean;
            readonly total?: number;
            readonly loadState?: TopicListLoadState;
        } = {},
        user?: User,
        drafts: ReadonlyMap<number, string> = new Map(),
    ): Promise<void> => {
        spectator = createComponent({
            props: { items, ...props },
            providers: [{ provide: AuthService, useValue: { user$: of(user) } }, mockForumDraftProvider(drafts)],
        });
        await settle();
        await settle();
    };

    const scroller = (): VirtualScrollerComponent<ForumTopicListItem> | null =>
        spectator.query<VirtualScrollerComponent<ForumTopicListItem>>(VirtualScrollerComponent);

    it('renders one row per topic', async () => {
        await render([createItem(), createItem({ id: 8, title: 'Вторая тема' })]);

        expect(spectator.queryAll('[data-testid="topic-item"]')).toHaveLength(2);
    });

    it('makes the whole row one link to the topic', async () => {
        await render([createItem({ id: 42 })]);

        const row = spectator.query('[data-testid="topic-item"]');
        expect(row?.querySelectorAll('a')).toHaveLength(1);
        expect(spectator.query('[data-testid="topic-link"]')?.getAttribute('href')).toBe('/forum/topic/42');
    });

    it('addresses a topic under the current route where the list asks for it', async () => {
        await render([createItem({ id: 42 })], { relativeLinks: true });

        expect(spectator.query('[data-testid="topic-link"]')?.getAttribute('href')).toBe('/topic/42');
    });

    it('shows the title inside the link', async () => {
        await render([createItem({ title: 'МОДЕРАТОРУ: техническое' })]);

        expect(spectator.query('[data-testid="topic-link"] [data-testid="topic-title"]')).toHaveText(
            'МОДЕРАТОРУ: техническое',
        );
    });

    it('shows no replies count', async () => {
        await render([createItem()]);

        expect(spectator.query('[data-testid="topic-replies"]')).not.toExist();
    });

    it('draws the avatar of the topic author inside the link', async () => {
        await render([createItem({ author: 'Петров Пётр Петрович' })]);

        const avatar = spectator.query('[data-testid="topic-author-avatar"]');
        expect(avatar?.getAttribute('aria-label')).toBe('Петров Пётр Петрович');
        expect(avatar?.closest('a')).toBe(spectator.query('[data-testid="topic-link"]'));
    });

    it('names the article the topic discusses as text inside the link', async () => {
        await render([createItem({ article: { id: 15, title: 'БОГ' } })]);

        const context = spectator.query('[data-testid="topic-context"]');
        expect(context).toHaveText('к статье БОГ');
        expect(context?.closest('a')).toBe(spectator.query('[data-testid="topic-link"]'));
    });

    it('names a news item as news', async () => {
        await render([
            createItem({ article: { id: 3, title: 'Освящение храма' }, section: { id: 'news', name: 'О новостях' } }),
        ]);

        expect(spectator.query('[data-testid="topic-context"]')).toHaveText('к новости Освящение храма');
    });

    it('names the section of a topic attached to no article', async () => {
        await render([createItem({ article: undefined, section: { id: 'common', name: 'Общие темы' } })]);

        expect(spectator.query('[data-testid="topic-context"]')).toHaveText('Общие темы');
    });

    describe('last message excerpt', () => {
        const reader = createMockUser({ login: 'petrov' });

        it('shows the start of the last message in place of the context', async () => {
            await render([createItem({ lastExcerpt: 'Согласен, но в источнике иначе' })]);

            const excerpt = spectator.query('[data-testid="topic-excerpt"]');
            expect(excerpt?.textContent?.trim()).toBe('Согласен, но в источнике иначе');
            expect(excerpt?.closest('a')).toBe(spectator.query('[data-testid="topic-link"]'));
            expect(spectator.query('[data-testid="topic-context"]')).not.toExist();
        });

        it('marks the reader’s own last message', async () => {
            await render([createItem({ lastExcerpt: 'Согласен', lastAuthorLogin: 'petrov' })], {}, reader);

            expect(spectator.query('[data-testid="topic-excerpt"]')?.textContent?.trim()).toBe('Вы: Согласен');
        });

        it('leaves someone else’s last message unmarked', async () => {
            await render([createItem({ lastExcerpt: 'Согласен', lastAuthorLogin: 'ivanov' })], {}, reader);

            expect(spectator.query('[data-testid="topic-excerpt"]')?.textContent?.trim()).toBe('Согласен');
        });

        it('leaves a guest’s last message unmarked for an anonymous reader', async () => {
            await render([createItem({ lastExcerpt: 'Согласен', lastAuthorLogin: undefined })]);

            expect(spectator.query('[data-testid="topic-excerpt"]')?.textContent?.trim()).toBe('Согласен');
        });

        it('falls back to the context when the last message has no text of its own', async () => {
            await render([createItem({ lastExcerpt: undefined, article: { id: 15, title: 'БОГ' } })], {}, reader);

            expect(spectator.query('[data-testid="topic-excerpt"]')).not.toExist();
            expect(spectator.query('[data-testid="topic-context"]')).toHaveText('к статье БОГ');
        });
    });

    describe('reply draft', () => {
        it('marks the avatar of a topic the reader left a draft in', async () => {
            await render([createItem({ id: 7 }), createItem({ id: 8 })], {}, undefined, new Map([[7, 'Ответ']]));

            const [withDraft, withoutDraft] = spectator.queryAll('[data-testid="topic-item"]');
            expect(withDraft.querySelector('[data-testid="topic-draft-badge"]')).toExist();
            expect(withoutDraft.querySelector('[data-testid="topic-draft-badge"]')).not.toExist();
        });

        it('shows the reader’s own words of the draft in place of the last message', async () => {
            await render(
                [createItem({ id: 7, lastExcerpt: 'Согласен' })],
                {},
                undefined,
                new Map([[7, '> Согласен\n\nА я нет']]),
            );

            expect(spectator.query('[data-testid="topic-draft"]')?.textContent?.trim()).toBe('Черновик: А я нет');
            expect(spectator.query('[data-testid="topic-excerpt"]')).not.toExist();
        });
    });

    it('keeps the context line when the row has nothing to put on it', async () => {
        await render([createItem({ article: undefined, section: undefined, lastPostAt: undefined })]);

        expect(spectator.query('[data-testid="topic-context"]')).toExist();
    });

    it('no longer names who wrote the last post', async () => {
        await render([createItem()]);

        expect(spectator.query('[data-testid="topic-last-author"]')).not.toExist();
    });

    it('shows the last-post time short, with the full date for assistive technology', async () => {
        await render([createItem({ lastPostAt: new Date(2025, 2, 16, 12, 30) })]);

        const time = spectator.query('[data-testid="topic-last-post"]');
        expect(time).toHaveText('16.03.25');
        expect(time?.getAttribute('aria-label')).toBe('16 марта 2025, 12:30');
    });

    it('omits the time when the topic has no date for its last post', async () => {
        await render([createItem({ lastPostAt: undefined })]);

        expect(spectator.query('[data-testid="topic-last-post"]')).toBeNull();
    });

    it.each(['/forum/topic/42', '/forum/topic/42/21'])(
        'marks the row of the open topic at %s as current',
        async url => {
            await render([createItem({ id: 7 }), createItem({ id: 42 })]);

            await spectator.inject(Router).navigateByUrl(url);
            spectator.detectChanges();

            const links = spectator.queryAll('[data-testid="topic-link"]');
            expect(links.map(link => link.getAttribute('aria-current'))).toEqual([null, 'page']);
        },
    );

    it('marks the open topic as current when topics are addressed under the list', async () => {
        await render([createItem({ id: 42 })], { relativeLinks: true });

        await spectator.inject(Router).navigateByUrl('/topic/42');
        spectator.detectChanges();

        expect(spectator.query('[data-testid="topic-link"]')?.getAttribute('aria-current')).toBe('page');
    });

    it('marks a pinned topic', async () => {
        await render([createItem({ pinned: true })]);

        expect(spectator.query('[data-testid="topic-pinned"]')).toBeTruthy();
    });

    it('leaves an unpinned topic unmarked', async () => {
        await render([createItem({ pinned: false })]);

        expect(spectator.query('[data-testid="topic-pinned"]')).toBeNull();
    });

    it('renders nothing for an empty list — the empty state belongs to the page', async () => {
        await render([]);

        expect(spectator.queryAll('[data-testid="topic-item"]')).toHaveLength(0);
    });

    describe('paging', () => {
        it('renders only the rows around the viewport, not the whole list', async () => {
            await render(Array.from({ length: 200 }, (_, index) => createItem({ id: index + 1 })));

            const rows = spectator.queryAll('[data-testid="topic-item"]');
            expect(rows.length).toBeGreaterThan(0);
            expect(rows.length).toBeLessThan(200);
        });

        it('pages the scroller through the whole list', async () => {
            await render([createItem()], { total: 57, loadState: 'loading' });

            expect(scroller()?.totalItems()).toBe(57);
            expect(scroller()?.isLoading()).toBe(true);
        });

        it('asks for more when the scroller nears the end', async () => {
            await render([createItem()], { total: 57 });
            const loadMore = jest.fn();
            spectator.output('loadMore').subscribe(loadMore);

            scroller()?.loadMore.emit();

            expect(loadMore).toHaveBeenCalledTimes(1);
        });

        it('offers no retry while the next page is only loading', async () => {
            await render([createItem()], { total: 57, loadState: 'loading' });

            expect(spectator.query('[data-testid="topic-list-retry"]')).not.toExist();
        });

        it('reports a failed page below the rows and retries on request', async () => {
            await render([createItem()], { total: 57, loadState: 'failed' });
            const retry = jest.fn();
            spectator.output('retry').subscribe(retry);

            expect(spectator.query('[data-testid="topic-list-error"]')).toHaveText('Не удалось загрузить');
            expect(scroller()?.isLoading()).toBe(false);
            spectator.click('[data-testid="topic-list-retry"]');

            expect(retry).toHaveBeenCalledTimes(1);
        });
    });
});
