import { ForumComposerComponent } from './forum-composer.component';
import { ForumService } from '../../../services/forum/forum.service';
import { NotificationService } from '@drevo-web/core';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { EditorComponent } from '@drevo-web/editor';
import { ForumMessage, ForumPostedMessage, ForumPostOutcome } from '@drevo-web/shared';
import { Spectator, createComponentFactory, mockProvider } from '@ngneat/spectator/jest';
import { NEVER, Observable, of, throwError } from 'rxjs';

function createMessage(overrides: Partial<ForumMessage> = {}): ForumMessage {
    return {
        id: 7,
        parentId: undefined,
        author: { name: 'Иванов И.И.', login: 'ivanov' },
        createdAt: new Date('2025-03-15T10:00:00Z'),
        html: '<p>Первая строка</p><p>Вторая</p>',
        ...overrides,
    };
}

function posted(
    approved: boolean,
    message = createMessage({ id: 100 }),
): Observable<ForumPostOutcome<ForumPostedMessage>> {
    return of({ status: 'posted', result: { message, approved } });
}

describe('ForumComposerComponent', () => {
    let spectator: Spectator<ForumComposerComponent>;
    let forumService: jest.Mocked<ForumService>;

    const createComponent = createComponentFactory({
        component: ForumComposerComponent,
        providers: [mockLoggerProvider(), mockProvider(ForumService), mockProvider(NotificationService)],
    });

    const type = (text: string): void => {
        spectator.triggerEventHandler(EditorComponent, 'contentChanged', text);
    };
    const sendButton = (): HTMLButtonElement | null => spectator.query('[data-testid="forum-send"]');
    const actions = (): Element | null => spectator.query('[data-testid="composer-actions"]');
    const editorHost = (): Element => spectator.query('[data-testid="composer-editor"]') as Element;
    const focusField = (): void => {
        editorHost().dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
        spectator.detectChanges();
    };
    /** Focus leaving the field for `to`; nothing at all when the reader clicked away from the page's controls. */
    const blurField = (to: Element | null = null): void => {
        editorHost().dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: to }));
        spectator.detectChanges();
    };

    beforeEach(() => {
        spectator = createComponent({ props: { topicId: 42 } });
        forumService = spectator.inject(ForumService);
    });

    it('writes in the wiki editor, grown to its text and without the toolbar or frame', () => {
        const editor = spectator.query(EditorComponent);

        expect(editor?.autoHeight()).toBe(true);
        expect(editor?.showToolbar()).toBe(false);
        expect(editor?.frameless()).toBe(true);
    });

    it('offers nothing to send until there is text', () => {
        focusField();
        expect(sendButton()).toBeDisabled();

        type('   ');
        expect(sendButton()).toBeDisabled();

        type('Ответ');
        expect(sendButton()).not.toBeDisabled();
    });

    describe('folding', () => {
        it('starts folded to the field alone', () => {
            expect(spectator.query('[data-testid="composer-editor"]')).toExist();
            expect(actions()).toBeNull();
        });

        it('marks where sending goes with an arrow that is a picture, not a control', () => {
            const arrow = spectator.query('[data-testid="composer-folded-send"]');

            expect(arrow).toExist();
            expect(arrow).toHaveAttribute('aria-hidden', 'true');
            expect(arrow?.closest('button')).toBeNull();
        });

        it('trades the arrow for the bar once unfolded', () => {
            focusField();

            expect(spectator.query('[data-testid="composer-folded-send"]')).toBeNull();
        });

        it('unfolds the bar once the field takes focus', () => {
            focusField();

            expect(actions()).toExist();
        });

        it('folds back when focus leaves an empty field', () => {
            focusField();

            blurField();

            expect(actions()).toBeNull();
        });

        it('stays unfolded while focus moves to its own controls', () => {
            focusField();

            blurField(sendButton());

            expect(actions()).toExist();
        });

        it('keeps focus in the field when its bar is pressed, where Safari would drop it', () => {
            focusField();
            const press = new MouseEvent('mousedown', { bubbles: true, cancelable: true });

            actions()?.dispatchEvent(press);

            expect(press.defaultPrevented).toBe(true);
        });

        it('keeps focus in the field when the reply is cancelled, where Safari would drop it', () => {
            spectator.component.replyTo(createMessage());
            focusField();
            const press = new MouseEvent('mousedown', { bubbles: true, cancelable: true });

            spectator.query('[data-testid="composer-reply-cancel"]')?.dispatchEvent(press);

            expect(press.defaultPrevented).toBe(true);
        });

        it('leaves a press in the field to the field', () => {
            focusField();
            const press = new MouseEvent('mousedown', { bubbles: true, cancelable: true });

            editorHost().dispatchEvent(press);

            expect(press.defaultPrevented).toBe(false);
        });

        it('stays unfolded while the field holds text', () => {
            focusField();
            type('Ответ');

            blurField();

            expect(actions()).toExist();
        });

        it('stays unfolded while it answers a message', () => {
            spectator.component.replyTo(createMessage());
            spectator.detectChanges();

            expect(actions()).toExist();
        });
    });

    describe('expanding', () => {
        const expandButton = (): HTMLButtonElement | null => spectator.query('[data-testid="composer-expand"]');

        beforeEach(() => focusField());

        it('grows the field with its text until the reader expands it', () => {
            expect(spectator.query(EditorComponent)?.autoHeight()).toBe(true);
            expect(expandButton()).toHaveAttribute('aria-label', 'Развернуть');
        });

        it('gives the field a fixed tall height when expanded, and back', () => {
            spectator.click(expandButton() as HTMLElement);

            expect(spectator.query(EditorComponent)?.autoHeight()).toBe(false);
            expect(expandButton()).toHaveAttribute('aria-label', 'Свернуть');

            spectator.click(expandButton() as HTMLElement);

            expect(spectator.query(EditorComponent)?.autoHeight()).toBe(true);
        });

        it('stays unfolded while expanded, even with the field empty and out of focus', () => {
            spectator.click(expandButton() as HTMLElement);

            blurField();

            expect(actions()).toExist();
        });

        it('shrinks back once the message is sent', () => {
            forumService.reply.mockReturnValue(posted(true));
            spectator.click(expandButton() as HTMLElement);
            type('Ответ');

            spectator.click(sendButton() as HTMLElement);

            expect(spectator.query(EditorComponent)?.autoHeight()).toBe(true);
        });
    });

    it('answers the topic itself when no message is chosen', () => {
        forumService.reply.mockReturnValue(posted(true));
        type('Ответ');

        spectator.click(sendButton() as HTMLElement);

        expect(forumService.reply).toHaveBeenCalledWith(42, 'Ответ', undefined);
    });

    describe('in reply to a message', () => {
        beforeEach(() => {
            spectator.component.replyTo(createMessage());
            spectator.detectChanges();
        });

        it('names the message above the field', () => {
            expect(spectator.query('[data-testid="composer-reply-author"]')).toHaveText('Иванов И.И.');
            expect(spectator.query('[data-testid="composer-reply-text"]')).toHaveText('Первая строка Вторая');
        });

        it('sends the reply to that message', () => {
            forumService.reply.mockReturnValue(posted(true));
            type('Ответ');

            spectator.click(sendButton() as HTMLElement);

            expect(forumService.reply).toHaveBeenCalledWith(42, 'Ответ', 7);
        });

        it('goes back to the topic itself when the reply is cancelled', () => {
            forumService.reply.mockReturnValue(posted(true));
            type('Ответ');

            spectator.click('[data-testid="composer-reply-cancel"]');
            spectator.click(sendButton() as HTMLElement);

            expect(spectator.query('[data-testid="composer-reply"]')).toBeNull();
            expect(forumService.reply).toHaveBeenCalledWith(42, 'Ответ', undefined);
        });
    });

    it('puts the cursor in the field once a message is chosen to answer or quote', () => {
        const focus = jest.spyOn(spectator.query(EditorComponent) as EditorComponent, 'focus');

        spectator.component.replyTo(createMessage());
        spectator.component.quote(createMessage());

        expect(focus).toHaveBeenCalledTimes(2);
    });

    it('quotes a message: answers it and puts its text into the field as quoted lines', () => {
        type('Уже написано');

        spectator.component.quote(createMessage());
        spectator.detectChanges();

        expect(spectator.query('[data-testid="composer-reply-author"]')).toHaveText('Иванов И.И.');
        expect(spectator.query(EditorComponent)?.content()).toBe('> Первая строка\n> Вторая\n\nУже написано');
    });

    it('hands an approved message on and starts over', () => {
        const message = createMessage({ id: 100 });
        forumService.reply.mockReturnValue(posted(true, message));
        const sent: ForumMessage[] = [];
        spectator.output<ForumMessage>('posted').subscribe(value => sent.push(value));
        spectator.component.replyTo(createMessage());
        type('Ответ');

        spectator.click(sendButton() as HTMLElement);

        expect(sent).toEqual([message]);
        expect(spectator.query(EditorComponent)?.content()).toBe('');
        expect(spectator.query('[data-testid="composer-reply"]')).toBeNull();
    });

    it('says a message waits for a moderator instead of handing it on', () => {
        forumService.reply.mockReturnValue(posted(false));
        const sent: ForumMessage[] = [];
        spectator.output<ForumMessage>('posted').subscribe(value => sent.push(value));
        type('Ответ');

        spectator.click(sendButton() as HTMLElement);

        expect(sent).toEqual([]);
        expect(spectator.inject(NotificationService).info).toHaveBeenCalledWith(
            'Сообщение отправлено на модерацию и появится после проверки.',
        );
        expect(spectator.query(EditorComponent)?.content()).toBe('');
    });

    it('shows why the forum refused the message and keeps the text', () => {
        forumService.reply.mockReturnValue(
            of({
                status: 'rejected',
                errors: { title: undefined, text: 'Излишнее цитирование!', other: undefined },
            }),
        );
        type('> цитата');

        spectator.click(sendButton() as HTMLElement);

        expect(spectator.query('[data-testid="composer-error"]')).toHaveText('Излишнее цитирование!');
        expect(spectator.query(EditorComponent)?.content()).toBe('> цитата');
    });

    it('drops the refusal once the reader edits the text', () => {
        forumService.reply.mockReturnValue(
            of({ status: 'rejected', errors: { title: undefined, text: 'Слишком коротко', other: undefined } }),
        );
        type('А');
        spectator.click(sendButton() as HTMLElement);

        type('А теперь подробнее');

        expect(spectator.query('[data-testid="composer-error"]')).toBeNull();
    });

    it('lets the reader send again after a failure', () => {
        forumService.reply.mockReturnValue(throwError(() => new Error('offline')));
        type('Ответ');

        spectator.click(sendButton() as HTMLElement);

        expect(sendButton()).not.toBeDisabled();
        expect(spectator.query(EditorComponent)?.content()).toBe('Ответ');
    });

    it('sends once while a message is on its way', () => {
        forumService.reply.mockReturnValue(NEVER);
        type('Ответ');

        spectator.click(sendButton() as HTMLElement);
        spectator.component.send();

        expect(forumService.reply).toHaveBeenCalledTimes(1);
    });
});
