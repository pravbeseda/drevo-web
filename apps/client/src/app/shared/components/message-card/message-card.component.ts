import { ClipboardService } from '../../../services/clipboard/clipboard.service';
import { messageExcerpt } from '../../helpers/message-excerpt';
import { WikiContentComponent } from '../wiki-content/wiki-content.component';
import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LoggerService, NotificationService } from '@drevo-web/core';
import { ForumMessage } from '@drevo-web/shared';
import {
    AvatarComponent,
    avatarNameColor,
    DropdownMenuComponent,
    DropdownMenuItemComponent,
    DropdownMenuTriggerDirective,
    FormatDatePipe,
    FormatTimePipe,
    IconButtonComponent,
    TooltipDirective,
} from '@drevo-web/ui';

/** What `routerLink` takes for the topic's address plus the message it anchors on. */
type MessageLink = readonly (string | number)[];

@Component({
    selector: 'app-message-card',
    imports: [
        AvatarComponent,
        DropdownMenuComponent,
        DropdownMenuItemComponent,
        DropdownMenuTriggerDirective,
        FormatDatePipe,
        FormatTimePipe,
        IconButtonComponent,
        RouterLink,
        TooltipDirective,
        WikiContentComponent,
    ],
    templateUrl: './message-card.component.html',
    styleUrl: './message-card.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        // The anchor scroll finds a card by its `id`, which names the message
        // rather than the position — "load more" changes the position. The
        // test hook carries the same name but stays a test concern.
        '[attr.id]': 'elementId()',
        '[attr.data-testid]': 'elementId()',
        '[class.message-card--anchored]': 'anchored()',
        '[class.message-card--own]': 'own()',
        '[class.message-card--series-end]': 'seriesEnd()',
        '[class.message-card--actions-shown]': 'actionsShown()',
        // A tap is how a screen without hover reveals the actions; the keyboard
        // reaches them by focus instead, which `:focus-within` shows.
        '(click)': 'toggleActions($event)',
    },
})
export class MessageCardComponent {
    private readonly document = inject(DOCUMENT);
    private readonly clipboard = inject(ClipboardService);
    private readonly notification = inject(NotificationService);
    private readonly logger = inject(LoggerService).withContext('MessageCard');
    private readonly _actionsShown = signal(false);

    readonly message = input.required<ForumMessage>();

    /**
     * The topic's own address, as path segments — `['forum', 'topic', '42']` in the
     * forum, `['articles', '7', 'forum', 'topic', '42']` inside an article. The
     * card appends the answered message to it rather than knowing where topics
     * live, which differs between the two places this card is mounted.
     */
    readonly topicPath = input.required<readonly string[]>();
    readonly anchored = input(false);

    /** Written by the reader, so drawn on the other side and without a name. */
    readonly own = input(false);

    /** Consecutive messages of one author form a series: the name heads it, the avatar closes it. */
    readonly seriesStart = input(true);
    readonly seriesEnd = input(true);

    /**
     * The id of the answered message. Its absence, not `message.parentId`,
     * decides whether the «in reply to» link exists: a reply to the topic
     * itself carries the root's id there.
     */
    readonly replyTo = input<number | undefined>(undefined);

    /** The answered message, when it is among the loaded ones; the quote falls back to a label otherwise. */
    readonly parent = input<ForumMessage | undefined>(undefined);

    readonly replyLink = computed<MessageLink | undefined>(() => {
        const replyTo = this.replyTo();

        return replyTo === undefined ? undefined : ['/', ...this.topicPath(), replyTo];
    });

    readonly reply = output();
    readonly quote = output();

    /** A screen without hover shows the actions on a tap on the message instead. */
    readonly actionsShown = this._actionsShown.asReadonly();

    protected readonly elementId = computed(() => `message-${this.message().id}`);
    protected readonly showAuthor = computed(() => this.seriesStart() && !this.own());
    protected readonly showAvatar = computed(() => this.seriesEnd() && !this.own());
    protected readonly authorColor = computed(() => avatarNameColor(this.message().author.name));

    protected readonly quoteColor = computed(() => {
        const parent = this.parent();
        return parent ? avatarNameColor(parent.author.name) : undefined;
    });

    protected readonly quoteText = computed(() => {
        const parent = this.parent();
        return parent ? messageExcerpt(parent, this.document) : undefined;
    });

    /** A tap on an action is that action, not a tap that hides the actions. */
    toggleActions(event: Event): void {
        if (event.target instanceof Element && event.target.closest('.message-card__actions')) {
            return;
        }
        this._actionsShown.update(shown => !shown);
    }

    copyLink(): void {
        const path = ['', ...this.topicPath(), this.message().id].join('/');
        const link = `${this.document.location.origin}${path}`;

        this.clipboard.copy(link).subscribe({
            complete: () => {
                this.notification.success('Ссылка скопирована');
                this.logger.info('Message link copied', { link });
            },
            error: (error: unknown) => {
                this.logger.error('Failed to copy the message link', error);
                this.notification.error('Не удалось скопировать ссылку');
            },
        });
    }
}
