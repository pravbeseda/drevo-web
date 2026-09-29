import { ForumService } from '../../../services/forum/forum.service';
import { forumEditorExtensions } from '../../helpers/forum-editor-extensions';
import { quoteForumText } from '../../helpers/forum-quote';
import { htmlToLines } from '../../helpers/html-to-text';
import { messageExcerpt } from '../../helpers/message-excerpt';
import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoggerService } from '@drevo-web/core';
import { EditorComponent } from '@drevo-web/editor';
import { ForumMessage, ForumPostedMessage, ForumPostOutcome } from '@drevo-web/shared';
import { ButtonComponent, IconButtonComponent } from '@drevo-web/ui';
import { finalize } from 'rxjs/operators';

/**
 * The reply form at the bottom of a topic. Without a chosen message the reply
 * answers the topic itself; the cards choose one through `replyTo` and `quote`.
 */
@Component({
    selector: 'app-forum-composer',
    imports: [ButtonComponent, EditorComponent, IconButtonComponent],
    templateUrl: './forum-composer.component.html',
    styleUrl: './forum-composer.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForumComposerComponent {
    private readonly forumService = inject(ForumService);
    private readonly document = inject(DOCUMENT);
    private readonly destroyRef = inject(DestroyRef);
    private readonly logger = inject(LoggerService).withContext('ForumComposer');

    private readonly _draft = signal('');
    private readonly _replyTarget = signal<ForumMessage | undefined>(undefined);
    private readonly _sending = signal(false);
    private readonly _error = signal<string | undefined>(undefined);
    private readonly _pending = signal(false);

    readonly topicId = input.required<number>();

    /** An approved message; one held for a moderator stays here as a notice. */
    readonly posted = output<ForumMessage>();

    readonly draft = this._draft.asReadonly();
    readonly replyTarget = this._replyTarget.asReadonly();
    readonly sending = this._sending.asReadonly();
    readonly error = this._error.asReadonly();
    readonly pending = this._pending.asReadonly();
    readonly canSend = computed(() => !this._sending() && this._draft().trim().length > 0);

    protected readonly replyExcerpt = computed(() => {
        const target = this._replyTarget();
        return target ? messageExcerpt(target, this.document) : undefined;
    });

    protected readonly editorExtensions = forumEditorExtensions('Сообщение', () => this.send());

    replyTo(message: ForumMessage): void {
        this._replyTarget.set(message);
    }

    quote(message: ForumMessage): void {
        const quoted = quoteForumText(htmlToLines(message.html, this.document));
        this._replyTarget.set(message);
        this._draft.update(draft => `${quoted}\n\n${draft}`);
    }

    cancelReply(): void {
        this._replyTarget.set(undefined);
    }

    onDraftChanged(text: string): void {
        // The editor echoes the text this component put into it; only the reader's typing clears the notices.
        if (text === this._draft()) {
            return;
        }
        this._draft.set(text);
        this._error.set(undefined);
        this._pending.set(false);
    }

    send(): void {
        if (!this.canSend()) {
            return;
        }

        const topicId = this.topicId();
        const parentId = this._replyTarget()?.id;
        this._sending.set(true);
        this._error.set(undefined);
        this.forumService
            .reply(topicId, this._draft(), parentId)
            .pipe(
                finalize(() => this._sending.set(false)),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe({
                next: outcome => this.applyOutcome(outcome, topicId),
                // The error toast has already told the reader; the text stays for another try.
                error: (error: unknown) => this.logger.error('Failed to post a reply', error),
            });
    }

    private applyOutcome(outcome: ForumPostOutcome<ForumPostedMessage>, topicId: number): void {
        if (outcome.status === 'rejected') {
            const { text, other, title } = outcome.errors;
            this._error.set(text ?? other ?? title);
            this.logger.warn('Reply refused', { topicId, errors: outcome.errors });
            return;
        }

        const { message, approved } = outcome.result;
        this._draft.set('');
        this._replyTarget.set(undefined);
        this._pending.set(!approved);
        this.logger.info('Reply posted', { topicId, messageId: message.id, approved });
        if (approved) {
            this.posted.emit(message);
        }
    }
}
