import { ForumComposerComponent } from './forum-composer.component';
import { ForumDraftService } from '../../../services/forum/forum-draft.service';
import { mockForumDraftProvider } from '../../../services/forum/forum-draft.testing';
import { ForumService } from '../../../services/forum/forum.service';
import { NotificationService } from '@drevo-web/core';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { EditorComponent } from '@drevo-web/editor';
import { ForumMessage, ForumPostedMessage, ForumPostOutcome } from '@drevo-web/shared';
import { Spectator, createComponentFactory, mockProvider } from '@ngneat/spectator/jest';
import { NEVER, Observable, of, Subject, throwError } from 'rxjs';

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
    let drafts: jest.Mocked<ForumDraftService>;

    const createComponent = createComponentFactory({
        component: ForumComposerComponent,
        providers: [
            mockLoggerProvider(),
            mockProvider(ForumService),
            mockProvider(NotificationService),
            mockForumDraftProvider(),
        ],
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

    const content = (): string | undefined => spectator.query(EditorComponent)?.content();

    beforeEach(() => {
        spectator = createComponent({ props: { topicId: 42 } });
        forumService = spectator.inject(ForumService);
        drafts = spectator.inject(ForumDraftService);
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

    it('quotes a message that quotes another one level deeper, and drops what that one quoted', () => {
        spectator.component.quote(
            createMessage({
                html:
                    '<blockquote class="quote"><blockquote class="quote">давнее</blockquote>' +
                    'цитата\nещё строка</blockquote>\n<p>Ответ</p>',
            }),
        );
        spectator.detectChanges();

        expect(spectator.query(EditorComponent)?.content()).toBe('> > цитата\n> > ещё строка\n> Ответ\n\n');
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
    describe('drafts', () => {
        /** The topic a reader opens next, with the draft it holds. */
        const openTopic = async (topicId: number, draft?: string): Promise<void> => {
            drafts.get.mockResolvedValue(draft);
            spectator.setInput('topicId', topicId);
            await spectator.fixture.whenStable();
            spectator.detectChanges();
        };

        it('brings back the draft the reader left in the topic', async () => {
            await openTopic(43, 'Начатый ответ');

            expect(drafts.get).toHaveBeenCalledWith(43);
            expect(content()).toBe('Начатый ответ');
        });

        it('hands what the reader types to the draft store', async () => {
            await spectator.fixture.whenStable();

            type('Ответ');

            expect(drafts.edit).toHaveBeenCalledWith(42, 'Ответ');
        });

        it('hands a quote to the draft store as well', async () => {
            await spectator.fixture.whenStable();

            spectator.component.quote(createMessage({ html: '<p>цитата</p>' }));

            expect(drafts.edit).toHaveBeenCalledWith(42, '> цитата\n\n');
        });

        it('keeps the text of the topic left behind and starts the next one afresh', async () => {
            await spectator.fixture.whenStable();
            spectator.component.replyTo(createMessage());
            type('Ответ');

            await openTopic(43);

            expect(drafts.save).toHaveBeenCalledWith(42, 'Ответ');
            expect(content()).toBe('');
            expect(spectator.query('[data-testid="composer-reply"]')).toBeNull();
        });

        it('stores the text when the composer goes away', async () => {
            await spectator.fixture.whenStable();
            type('Ответ');

            spectator.fixture.destroy();

            expect(drafts.save).toHaveBeenCalledWith(42, 'Ответ');
        });

        it('leaves the stored draft alone when the composer goes before it is read', async () => {
            await spectator.fixture.whenStable();
            drafts.get.mockReturnValue(new Promise<never>(() => undefined));
            spectator.setInput('topicId', 43);
            spectator.detectChanges();

            spectator.fixture.destroy();

            expect(drafts.save).not.toHaveBeenCalledWith(43, expect.anything());
        });

        it('keeps what the reader typed while the draft was loading', async () => {
            let resolve: ((text: string) => void) | undefined;
            drafts.get.mockReturnValue(new Promise<string>(done => (resolve = done)));
            spectator.setInput('topicId', 43);
            spectator.detectChanges();
            type('Новое');

            resolve?.('Старое');
            await spectator.fixture.whenStable();
            spectator.detectChanges();

            expect(content()).toBe('Новое');
        });

        it('discards the draft once the message is posted', async () => {
            await spectator.fixture.whenStable();
            forumService.reply.mockReturnValue(posted(true));
            type('Ответ');

            spectator.click(sendButton() as HTMLElement);

            expect(drafts.save).toHaveBeenLastCalledWith(42, '');
        });

        it('tells about a refusal that comes after the reader moved on, leaving the next topic alone', async () => {
            await spectator.fixture.whenStable();
            const outcome = new Subject<ForumPostOutcome<ForumPostedMessage>>();
            forumService.reply.mockReturnValue(outcome);
            type('Ответ');
            spectator.click(sendButton() as HTMLElement);
            await openTopic(43, 'Другой ответ');

            outcome.next({
                status: 'rejected',
                errors: { title: undefined, text: 'Излишнее цитирование!', other: undefined },
            });
            spectator.detectChanges();

            expect(spectator.query('[data-testid="composer-error"]')).toBeNull();
            expect(spectator.inject(NotificationService).error).toHaveBeenCalledWith(
                'Сообщение не отправлено (Излишнее цитирование!). Текст сохранён в черновике темы.',
            );
            expect(drafts.save).not.toHaveBeenCalledWith(42, '');
            expect(content()).toBe('Другой ответ');
        });

        it('leaves the next topic alone when a message posts after the reader moved on', async () => {
            await spectator.fixture.whenStable();
            const outcome = new Subject<ForumPostOutcome<ForumPostedMessage>>();
            forumService.reply.mockReturnValue(outcome);
            const sent: ForumMessage[] = [];
            spectator.output<ForumMessage>('posted').subscribe(value => sent.push(value));
            type('Ответ');
            spectator.click(sendButton() as HTMLElement);
            await openTopic(43, 'Другой ответ');

            outcome.next({ status: 'posted', result: { message: createMessage({ id: 100 }), approved: true } });
            spectator.detectChanges();

            expect(drafts.save).toHaveBeenLastCalledWith(42, '');
            expect(sent).toEqual([]);
            expect(content()).toBe('Другой ответ');
        });
    });
});
