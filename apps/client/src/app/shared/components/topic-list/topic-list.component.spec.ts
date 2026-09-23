import { TopicListComponent } from './topic-list.component';
import { Component } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { ForumTopicListItem } from '@drevo-web/shared';
import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';

function createItem(overrides: Partial<ForumTopicListItem> = {}): ForumTopicListItem {
    return {
        id: 7,
        title: 'Первая тема',
        lastPostAt: new Date('2025-03-16T12:30:00Z'),
        pinned: false,
        lastAuthor: 'Петров П.П.',
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
        providers: [provideRouter([{ path: '**', component: BlankComponent }])],
    });

    const render = (items: readonly ForumTopicListItem[]): void => {
        spectator = createComponent({ props: { items } });
    };

    it('renders one row per topic', () => {
        render([createItem(), createItem({ id: 8, title: 'Вторая тема' })]);

        expect(spectator.queryAll('[data-testid="topic-item"]')).toHaveLength(2);
    });

    it('makes the whole row one link to the topic', () => {
        render([createItem({ id: 42 })]);

        const row = spectator.query('[data-testid="topic-item"]');
        expect(row?.querySelectorAll('a')).toHaveLength(1);
        expect(spectator.query('[data-testid="topic-link"]')?.getAttribute('href')).toBe('/forum/topic/42');
    });

    it('addresses a topic under the current route where the list asks for it', () => {
        spectator = createComponent({ props: { items: [createItem({ id: 42 })], relativeLinks: true } });

        expect(spectator.query('[data-testid="topic-link"]')?.getAttribute('href')).toBe('/topic/42');
    });

    it('shows the title inside the link', () => {
        render([createItem({ title: 'МОДЕРАТОРУ: техническое' })]);

        expect(spectator.query('[data-testid="topic-link"] [data-testid="topic-title"]')).toHaveText(
            'МОДЕРАТОРУ: техническое',
        );
    });

    it('shows neither the topic author nor the replies count', () => {
        render([createItem()]);

        expect(spectator.query('[data-testid="topic-author"]')).not.toExist();
        expect(spectator.query('[data-testid="topic-replies"]')).not.toExist();
    });

    it('names the article the topic discusses as text inside the link', () => {
        render([createItem({ article: { id: 15, title: 'БОГ' } })]);

        const context = spectator.query('[data-testid="topic-context"]');
        expect(context).toHaveText('к статье БОГ');
        expect(context?.closest('a')).toBe(spectator.query('[data-testid="topic-link"]'));
    });

    it('names a news item as news', () => {
        render([
            createItem({ article: { id: 3, title: 'Освящение храма' }, section: { id: 'news', name: 'О новостях' } }),
        ]);

        expect(spectator.query('[data-testid="topic-context"]')).toHaveText('к новости Освящение храма');
    });

    it('names the section of a topic attached to no article', () => {
        render([createItem({ article: undefined, section: { id: 'common', name: 'Общие темы' } })]);

        expect(spectator.query('[data-testid="topic-context"]')).toHaveText('Общие темы');
    });

    it('keeps all three lines when the row has nothing to put on them', () => {
        render([createItem({ article: undefined, section: undefined, lastAuthor: undefined, lastPostAt: undefined })]);

        expect(spectator.query('[data-testid="topic-context"]')).toExist();
        expect(spectator.query('[data-testid="topic-last-author"]')).toExist();
    });

    it('names who wrote the last post', () => {
        render([createItem({ lastAuthor: 'Валентин100' })]);

        expect(spectator.query('[data-testid="topic-last-author"]')).toHaveText('Валентин100');
    });

    it('shows the last-post time short, with the full date for assistive technology', () => {
        render([createItem({ lastPostAt: new Date(2025, 2, 16, 12, 30) })]);

        const time = spectator.query('[data-testid="topic-last-post"]');
        expect(time).toHaveText('16.03.25');
        expect(time?.getAttribute('aria-label')).toBe('16 марта 2025, 12:30');
    });

    it('omits the time when the topic has no date for its last post', () => {
        render([createItem({ lastPostAt: undefined })]);

        expect(spectator.query('[data-testid="topic-last-post"]')).toBeNull();
    });

    it.each(['/forum/topic/42', '/forum/topic/42/21'])(
        'marks the row of the open topic at %s as current',
        async url => {
            render([createItem({ id: 7 }), createItem({ id: 42 })]);

            await spectator.inject(Router).navigateByUrl(url);
            spectator.detectChanges();

            const links = spectator.queryAll('[data-testid="topic-link"]');
            expect(links.map(link => link.getAttribute('aria-current'))).toEqual([null, 'page']);
        },
    );

    it('marks the open topic as current when topics are addressed under the list', async () => {
        spectator = createComponent({ props: { items: [createItem({ id: 42 })], relativeLinks: true } });

        await spectator.inject(Router).navigateByUrl('/topic/42');
        spectator.detectChanges();

        expect(spectator.query('[data-testid="topic-link"]')?.getAttribute('aria-current')).toBe('page');
    });

    it('marks a pinned topic', () => {
        render([createItem({ pinned: true })]);

        expect(spectator.query('[data-testid="topic-pinned"]')).toBeTruthy();
    });

    it('leaves an unpinned topic unmarked', () => {
        render([createItem({ pinned: false })]);

        expect(spectator.query('[data-testid="topic-pinned"]')).toBeNull();
    });

    it('renders nothing for an empty list — the empty state belongs to the page', () => {
        render([]);

        expect(spectator.queryAll('[data-testid="topic-item"]')).toHaveLength(0);
    });
});
