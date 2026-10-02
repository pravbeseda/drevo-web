import { ForumService } from '../../../services/forum/forum.service';
import { forumEditorExtensions } from '../../helpers/forum-editor-extensions';
import { quoteForumText } from '../../helpers/forum-quote';
import { htmlToLines } from '../../helpers/html-to-text';
import { messageExcerpt } from '../../helpers/message-excerpt';
import { ForumSendBarComponent } from '../forum-send-bar/forum-send-bar.component';
import { DOCUMENT } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ElementRef,
    computed,
    inject,
    input,
    output,
    signal,
    viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoggerService, NotificationService } from '@drevo-web/core';
import { EditorComponent } from '@drevo-web/editor';
import { ForumMessage, ForumPostedMessage, ForumPostOutcome } from '@drevo-web/shared';
import { IconButtonComponent, IconComponent } from '@drevo-web/ui';
import { finalize } from 'rxjs/operators';

/**
 * The reply form at the bottom of a topic. Without a chosen message the reply
 * answers the topic itself; the cards choose one through `replyTo` and `quote`.
 * It rests folded to the field alone and unfolds its bar while in use.
 */
@Component({
    selector: 'app-forum-composer',
    imports: [EditorComponent, ForumSendBarComponent, IconButtonComponent, IconComponent],
    templateUrl: './forum-composer.component.html',
    styleUrl: './forum-composer.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '(focusin)': 'onFocusIn()',
        '(focusout)': 'onFocusOut($event)',
    },
})
export class ForumComposerComponent {
    private readonly forumService = inject(ForumService);
    private readonly document = inject(DOCUMENT);
    private readonly destroyRef = inject(DestroyRef);
    private readonly logger = inject(LoggerService).withContext('ForumComposer');
    private readonly notification = inject(NotificationService);

    private readonly _draft = signal('');
    private readonly _replyTarget = signal<ForumMessage | undefined>(undefined);
    private readonly _sending = signal(false);
    private readonly _error = signal<string | undefined>(undefined);
    private readonly _focused = signal(false);
    private readonly _expanded = signal(false);

    private readonly field = viewChild.required<string, ElementRef<HTMLElement>>('field', { read: ElementRef });

    readonly topicId = input.required<number>();

    /** An approved message; one held for a moderator is only announced. */
    readonly posted = output<ForumMessage>();

    readonly draft = this._draft.asReadonly();
    readonly replyTarget = this._replyTarget.asReadonly();
    readonly sending = this._sending.asReadonly();
    readonly error = this._error.asReadonly();
    readonly expanded = this._expanded.asReadonly();
    readonly canSend = computed(() => !this._sending() && this._draft().trim().length > 0);

    /** Anything the reader has started, or is about to, keeps the bar on screen. */
    protected readonly open = computed(
        () =>
            this._focused() ||
            this._expanded() ||
            this._draft().length > 0 ||
            this._replyTarget() !== undefined ||
            this._error() !== undefined,
    );

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

    toggleExpanded(): void {
        this._expanded.update(expanded => !expanded);
    }

    onFocusIn(): void {
        this._focused.set(true);
    }

    /** A press anywhere in the frame but the field itself leaves the focus where it is. */
    protected keepFieldFocus(event: MouseEvent): void {
        const { target } = event;
        if (target instanceof Node && this.field().nativeElement.contains(target)) {
            return;
        }
        event.preventDefault();
    }

    /** Focus moving between the field and the composer's own buttons does not leave it. */
    onFocusOut(event: FocusEvent): void {
        const { currentTarget, relatedTarget } = event;
        if (currentTarget instanceof Node && relatedTarget instanceof Node && currentTarget.contains(relatedTarget)) {
            return;
        }
        this._focused.set(false);
    }

    onDraftChanged(text: string): void {
        // The editor echoes the text this component put into it; only the reader's typing clears the refusal.
        if (text === this._draft()) {
            return;
        }
        this._draft.set(text);
        this._error.set(undefined);
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
        this._expanded.set(false);
        this.logger.info('Reply posted', { topicId, messageId: message.id, approved });
        if (approved) {
            this.posted.emit(message);
        } else {
            this.notification.info('Сообщение отправлено на модерацию и появится после проверки.');
        }
    }
}
