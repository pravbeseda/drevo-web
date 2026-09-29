import { ForumComposerComponent } from './forum-composer.component';
import { ForumService } from '../../../services/forum/forum.service';
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
        providers: [mockLoggerProvider(), mockProvider(ForumService)],
    });

    const type = (text: string): void => {
        spectator.triggerEventHandler(EditorComponent, 'contentChanged', text);
    };
    const sendButton = (): HTMLButtonElement | null => spectator.query('[data-testid="composer-send"]');

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

    it('shows attaching, not yet available', () => {
        expect(spectator.query('[data-testid="composer-attach"]')).toBeDisabled();
    });

    it('offers nothing to send until there is text', () => {
        expect(sendButton()).toBeDisabled();

        type('   ');
        expect(sendButton()).toBeDisabled();

        type('Ответ');
        expect(sendButton()).not.toBeDisabled();
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
        expect(spectator.query('[data-testid="composer-pending"]')).toHaveText('на модерацию');
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
