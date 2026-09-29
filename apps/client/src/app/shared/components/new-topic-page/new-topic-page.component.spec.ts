import { NewTopicPageComponent } from './new-topic-page.component';
import { NEW_TOPIC_TARGET, NewTopicTarget } from './new-topic-target';
import { ForumService } from '../../../services/forum/forum.service';
import { TopicListPagesService } from '../../services/topic-list-pages/topic-list-pages.service';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { SidebarService } from '@drevo-web/core';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { EditorComponent } from '@drevo-web/editor';
import { ForumCreatedTopic, ForumPostOutcome, ForumSection, SidebarAction } from '@drevo-web/shared';
import { ButtonToggleGroupComponent, ConfirmationService, InlineInputComponent } from '@drevo-web/ui';
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
    let confirmation: jest.Mocked<ConfirmationService>;
    let route: ActivatedRoute;
    let navigate: jest.SpyInstance;

    const createComponent = createComponentFactory({
        component: NewTopicPageComponent,
        providers: [
            provideRouter([]),
            mockLoggerProvider(),
            mockProvider(TopicListPagesService),
            mockProvider(ConfirmationService, { open: jest.fn().mockReturnValue(of('confirm')) }),
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
        confirmation = spectator.inject(ConfirmationService);
        route = spectator.inject(ActivatedRoute);
        navigate = jest.spyOn(spectator.inject(Router), 'navigate').mockResolvedValue(true);
        spectator.detectChanges();
    };

    const fill = (title: string, text: string): void => {
        spectator.triggerEventHandler(InlineInputComponent, 'valueChanged', title);
        spectator.triggerEventHandler(EditorComponent, 'contentChanged', text);
        spectator.detectChanges();
    };
    const action = (testId: string): SidebarAction | undefined =>
        spectator
            .inject(SidebarService)
            .actions()
            .find(candidate => candidate.testId === testId);
    const activate = (testId: string): void => {
        action(testId)?.action?.();
        spectator.detectChanges();
    };
    const submit = (): void => activate('new-topic-submit');
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

        it('writes the text in the wiki editor without its frame', () => {
            expect(spectator.query(EditorComponent)?.frameless()).toBe(true);
        });

        it('offers nothing to publish until both the title and the text are there', () => {
            expect(action('new-topic-submit')?.disabled).toBe(true);

            fill('Тема', '  ');
            expect(action('new-topic-submit')?.disabled).toBe(true);

            fill('Тема', 'Текст');
            expect(action('new-topic-submit')?.disabled).toBe(false);
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

            expect(spectator.query('[data-testid="new-topic-pending"]')).toHaveText('на модерацию');
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

        it('holds both actions while the topic is being sent', () => {
            forumService.createTopic.mockReturnValue(NEVER);
            fill('Тема', 'Текст');

            submit();

            expect(action('new-topic-submit')?.disabled).toBe(true);
            expect(action('new-topic-cancel')?.disabled).toBe(true);
        });

        it('lets the reader try again after a failure', () => {
            forumService.createTopic.mockReturnValue(throwError(() => new Error('offline')));
            fill('Тема', 'Текст');

            submit();

            expect(action('new-topic-submit')?.disabled).toBe(false);
        });

        describe('cancelling', () => {
            it('returns to the list at once when nothing was written', () => {
                activate('new-topic-cancel');

                expect(confirmation.open).not.toHaveBeenCalled();
                expect(navigate).toHaveBeenCalledWith(['..'], { relativeTo: route });
            });

            it('asks before dropping what was written, and leaves once the reader agrees', () => {
                fill('Тема', '');

                activate('new-topic-cancel');

                expect(confirmation.open).toHaveBeenCalled();
                expect(navigate).toHaveBeenCalledWith(['..'], { relativeTo: route });
            });

            it('stays when the reader decides to keep writing', () => {
                confirmation.open.mockReturnValue(of('cancel'));
                fill('', 'Текст');

                activate('new-topic-cancel');

                expect(navigate).not.toHaveBeenCalled();
            });
        });
    });

    describe('among every section', () => {
        beforeEach(() => render({}));

        it('offers nothing to publish until a section is chosen', () => {
            fill('Тема', 'Текст');
            expect(action('new-topic-submit')?.disabled).toBe(true);

            pickSection('news');
            expect(action('new-topic-submit')?.disabled).toBe(false);
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
