import { NewTopicPageComponent } from './new-topic-page.component';
import { NEW_TOPIC_TARGET, NewTopicTarget } from './new-topic-target';
import { ForumService } from '../../../services/forum/forum.service';
import { TopicListPagesService } from '../../services/topic-list-pages/topic-list-pages.service';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { NotificationService, SidebarService } from '@drevo-web/core';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { EditorComponent } from '@drevo-web/editor';
import { ForumCreatedTopic, ForumPostOutcome, ForumSection } from '@drevo-web/shared';
import { ButtonToggleGroupComponent, InlineInputComponent } from '@drevo-web/ui';
import { Spectator, createComponentFactory, mockProvider } from '@ngneat/spectator/jest';
import { NEVER, Observable, of, throwError } from 'rxjs';

const SECTIONS: readonly ForumSection[] = [
    { id: 'common', name: 'Общий', description: '' },
    { id: 'news', name: 'Новости', description: '' },
];

function created(approved: boolean): Observable<ForumPostOutcome<ForumCreatedTopic>> {
    return of({
        status: 'posted',
        result: {
            topicId: 43,
            approved,
            message: {
                id: 100,
                parentId: undefined,
                author: { name: 'Иванов И.И.', login: 'ivanov' },
                createdAt: undefined,
                html: '<p>Текст</p>',
            },
        },
    });
}

describe('NewTopicPageComponent', () => {
    let spectator: Spectator<NewTopicPageComponent>;
    let forumService: jest.Mocked<ForumService>;
    let route: ActivatedRoute;
    let navigate: jest.SpyInstance;

    const createComponent = createComponentFactory({
        component: NewTopicPageComponent,
        providers: [
            provideRouter([]),
            mockLoggerProvider(),
            mockProvider(TopicListPagesService),
            mockProvider(NotificationService),
        ],
        detectChanges: false,
    });

    const render = (target: Partial<NewTopicTarget>): void => {
        const full: NewTopicTarget = { part: undefined, partId: undefined, ownerTitle: undefined, ...target };
        spectator = createComponent({
            providers: [
                { provide: NEW_TOPIC_TARGET, useValue: signal(full) },
                mockProvider(ForumService, { getSections: jest.fn().mockReturnValue(of(SECTIONS)) }),
            ],
        });
        forumService = spectator.inject(ForumService);
        route = spectator.inject(ActivatedRoute);
        navigate = jest.spyOn(spectator.inject(Router), 'navigate').mockResolvedValue(true);
        spectator.detectChanges();
    };

    const fill = (title: string, text: string): void => {
        spectator.triggerEventHandler(InlineInputComponent, 'valueChanged', title);
        spectator.triggerEventHandler(EditorComponent, 'contentChanged', text);
        spectator.detectChanges();
    };
    const sendButton = (): HTMLButtonElement | null => spectator.query('[data-testid="forum-send"]');
    const submit = (): void => {
        spectator.click(sendButton() as HTMLElement);
    };
    const pickSection = (section: string): void => {
        // `ngModelChange` is the NgModel directive's output, not the group's own.
        spectator.triggerEventHandler('ui-button-toggle-group', 'ngModelChange', section);
        spectator.detectChanges();
    };

    describe('in a section', () => {
        beforeEach(() => render({ part: 'common' }));

        it('offers every section with the list’s own already picked', async () => {
            await spectator.fixture.whenStable();

            expect(
                spectator
                    .query(ButtonToggleGroupComponent)
                    ?.options()
                    .map(option => option.label),
            ).toEqual(['Общий', 'Новости']);
            expect(spectator.query('[data-testid="toggle-common"]')).toHaveClass('mat-button-toggle-checked');
        });

        it('sends from the bar under the text, leaving the sidebar alone', () => {
            expect(sendButton()).toBeTruthy();
            expect(spectator.inject(SidebarService).actions()).toEqual([]);
        });

        it('writes the text in the wiki editor without its frame', () => {
            expect(spectator.query(EditorComponent)?.frameless()).toBe(true);
        });

        it('offers nothing to publish until both the title and the text are there', () => {
            expect(sendButton()).toBeDisabled();

            fill('Тема', '  ');
            expect(sendButton()).toBeDisabled();

            fill('Тема', 'Текст');
            expect(sendButton()).not.toBeDisabled();
        });

        it('starts the topic in that section', () => {
            forumService.createTopic.mockReturnValue(created(true));
            fill('Тема', 'Текст');

            submit();

            expect(forumService.createTopic).toHaveBeenCalledWith({
                part: 'common',
                partId: undefined,
                title: 'Тема',
                text: 'Текст',
            });
        });

        it('opens the new topic beside the list and has the list show it', () => {
            forumService.createTopic.mockReturnValue(created(true));
            fill('Тема', 'Текст');

            submit();

            expect(spectator.inject(TopicListPagesService).reload).toHaveBeenCalled();
            expect(navigate).toHaveBeenCalledWith(['../topic', 43], { relativeTo: route });
        });

        it('opens a topic moved to another section in that section’s list', () => {
            forumService.createTopic.mockReturnValue(created(true));
            pickSection('news');
            fill('Тема', 'Текст');

            submit();

            expect(forumService.createTopic).toHaveBeenCalledWith(expect.objectContaining({ part: 'news' }));
            expect(navigate).toHaveBeenCalledWith(['/forum', 'news', 'topic', 43]);
        });

        it('says the topic waits for a moderator and clears the form', () => {
            forumService.createTopic.mockReturnValue(created(false));
            fill('Тема', 'Текст');

            submit();

            expect(spectator.inject(NotificationService).info).toHaveBeenCalledWith(
                'Тема отправлена на модерацию и появится после проверки.',
            );
            expect(spectator.query(EditorComponent)?.content()).toBe('');
            expect(spectator.query(InlineInputComponent)?.value()).toBe('');
            expect(navigate).not.toHaveBeenCalled();
        });

        it('shows each refusal under its field and keeps what was written', () => {
            forumService.createTopic.mockReturnValue(
                of({
                    status: 'rejected',
                    errors: { title: 'Заполните заголовок', text: 'Слишком много ссылок', other: 'Подождите' },
                }),
            );
            fill('Тема', 'Текст');

            submit();

            expect(spectator.query('[data-testid="new-topic-title-error"]')).toHaveText('Заполните заголовок');
            expect(spectator.query('[data-testid="new-topic-text-error"]')).toHaveText('Слишком много ссылок');
            expect(spectator.query('[data-testid="new-topic-error"]')).toHaveText('Подождите');
            expect(spectator.query(EditorComponent)?.content()).toBe('Текст');
        });

        it('holds sending while the topic is being sent', () => {
            forumService.createTopic.mockReturnValue(NEVER);
            fill('Тема', 'Текст');

            submit();

            expect(sendButton()).toBeDisabled();
        });

        it('lets the reader try again after a failure', () => {
            forumService.createTopic.mockReturnValue(throwError(() => new Error('offline')));
            fill('Тема', 'Текст');

            submit();

            expect(sendButton()).not.toBeDisabled();
        });
    });

    describe('among every section', () => {
        beforeEach(() => render({}));

        it('offers nothing to publish until a section is chosen', () => {
            fill('Тема', 'Текст');
            expect(sendButton()).toBeDisabled();

            pickSection('news');
            expect(sendButton()).not.toBeDisabled();
        });

        it('opens the topic beside the list, which holds every section', () => {
            forumService.createTopic.mockReturnValue(created(true));
            pickSection('news');
            fill('Тема', 'Текст');

            submit();

            expect(forumService.createTopic).toHaveBeenCalledWith(expect.objectContaining({ part: 'news' }));
            expect(navigate).toHaveBeenCalledWith(['../topic', 43], { relativeTo: route });
        });
    });

    describe('under an article', () => {
        beforeEach(() => render({ part: 'articles', partId: 15, ownerTitle: 'Макарий Великий' }));

        it('names the article instead of offering sections', () => {
            expect(spectator.query('[data-testid="new-topic-owner"]')).toHaveText('Макарий Великий');
            expect(spectator.query(ButtonToggleGroupComponent)).toBeNull();
            expect(forumService.getSections).not.toHaveBeenCalled();
        });

        it('binds the topic to that article and opens it beside the list', () => {
            forumService.createTopic.mockReturnValue(created(true));
            fill('Тема', 'Текст');

            submit();

            expect(forumService.createTopic).toHaveBeenCalledWith(
                expect.objectContaining({ part: 'articles', partId: 15 }),
            );
            expect(navigate).toHaveBeenCalledWith(['../topic', 43], { relativeTo: route });
        });
    });

    it('offers no sections under an article whose title is still unknown', () => {
        render({ part: 'articles', partId: 15 });

        expect(spectator.query(ButtonToggleGroupComponent)).toBeNull();
    });
});
