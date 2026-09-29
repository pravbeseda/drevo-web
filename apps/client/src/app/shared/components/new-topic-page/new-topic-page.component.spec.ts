import { NewTopicPageComponent } from './new-topic-page.component';
import { NEW_TOPIC_TARGET, NewTopicTarget } from './new-topic-target';
import { ForumService } from '../../../services/forum/forum.service';
import { TopicListPagesService } from '../../services/topic-list-pages/topic-list-pages.service';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { EditorComponent } from '@drevo-web/editor';
import { ForumCreatedTopic, ForumPostOutcome, ForumSection } from '@drevo-web/shared';
import { ButtonToggleGroupComponent, TextInputComponent } from '@drevo-web/ui';
import { Spectator, createComponentFactory, mockProvider } from '@ngneat/spectator/jest';
import { Observable, of, throwError } from 'rxjs';

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

    const createComponent = createComponentFactory({
        component: NewTopicPageComponent,
        providers: [
            provideRouter([]),
            mockLoggerProvider(),
            mockProvider(ForumService, { getSections: jest.fn().mockReturnValue(of(SECTIONS)) }),
            mockProvider(TopicListPagesService),
        ],
        detectChanges: false,
    });

    const render = (target: NewTopicTarget): void => {
        spectator = createComponent({ providers: [{ provide: NEW_TOPIC_TARGET, useValue: signal(target) }] });
        forumService = spectator.inject(ForumService);
        route = spectator.inject(ActivatedRoute);
        jest.spyOn(spectator.inject(Router), 'navigate').mockResolvedValue(true);
        spectator.detectChanges();
    };

    const fill = (title: string, text: string): void => {
        spectator.triggerEventHandler(TextInputComponent, 'valueChanged', title);
        spectator.triggerEventHandler(EditorComponent, 'contentChanged', text);
        spectator.detectChanges();
    };
    const submitButton = (): HTMLButtonElement | null => spectator.query('[data-testid="new-topic-submit"]');
    const submit = (): void => {
        spectator.click(submitButton() as HTMLElement);
        spectator.detectChanges();
    };

    describe('in a section', () => {
        beforeEach(() => render({ part: 'common', partId: undefined }));

        it('asks for no section', () => {
            expect(spectator.query(ButtonToggleGroupComponent)).toBeNull();
        });

        it('offers nothing to create until both the title and the text are there', () => {
            expect(submitButton()).toBeDisabled();

            fill('Тема', '  ');
            expect(submitButton()).toBeDisabled();

            fill('Тема', 'Текст');
            expect(submitButton()).not.toBeDisabled();
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
            const navigate = jest.spyOn(spectator.inject(Router), 'navigate');
            fill('Тема', 'Текст');

            submit();

            expect(spectator.inject(TopicListPagesService).reload).toHaveBeenCalled();
            expect(navigate).toHaveBeenCalledWith(['../topic', 43], { relativeTo: route });
        });

        it('says the topic waits for a moderator and clears the form', () => {
            forumService.createTopic.mockReturnValue(created(false));
            const navigate = jest.spyOn(spectator.inject(Router), 'navigate');
            fill('Тема', 'Текст');

            submit();

            expect(spectator.query('[data-testid="new-topic-pending"]')).toHaveText('на модерацию');
            expect(spectator.query(EditorComponent)?.content()).toBe('');
            expect(spectator.query(TextInputComponent)?.value()).toBe('');
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

        it('lets the reader try again after a failure', () => {
            forumService.createTopic.mockReturnValue(throwError(() => new Error('offline')));
            fill('Тема', 'Текст');

            submit();

            expect(submitButton()).not.toBeDisabled();
        });
    });

    describe('among every section', () => {
        beforeEach(() => render({ part: undefined, partId: undefined }));

        it('asks which section the topic goes to', () => {
            expect(
                spectator
                    .query(ButtonToggleGroupComponent)
                    ?.options()
                    .map(option => option.label),
            ).toEqual(['Общий', 'Новости']);
        });

        it('offers nothing to create until a section is chosen', () => {
            fill('Тема', 'Текст');
            expect(submitButton()).toBeDisabled();

            spectator.component.onSectionPicked('news');
            spectator.detectChanges();
            expect(submitButton()).not.toBeDisabled();
        });

        it('starts the topic in the chosen section', () => {
            forumService.createTopic.mockReturnValue(created(true));
            spectator.component.onSectionPicked('news');
            fill('Тема', 'Текст');

            submit();

            expect(forumService.createTopic).toHaveBeenCalledWith(expect.objectContaining({ part: 'news' }));
        });
    });

    it('binds a topic started under an article to that article', () => {
        render({ part: 'articles', partId: 15 });
        forumService.createTopic.mockReturnValue(created(true));
        fill('Тема', 'Текст');

        submit();

        expect(spectator.query(ButtonToggleGroupComponent)).toBeNull();
        expect(forumService.createTopic).toHaveBeenCalledWith(
            expect.objectContaining({ part: 'articles', partId: 15 }),
        );
    });
});
