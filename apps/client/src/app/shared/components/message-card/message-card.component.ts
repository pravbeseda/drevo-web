import { htmlToText } from '../../helpers/html-to-text';
import { WikiContentComponent } from '../wiki-content/wiki-content.component';
import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ForumMessage } from '@drevo-web/shared';
import { AvatarComponent, avatarNameColor, FormatDatePipe, FormatTimePipe, TooltipDirective } from '@drevo-web/ui';

/** What `routerLink` takes for the topic's address plus the message it anchors on. */
type MessageLink = readonly (string | number)[];

/** The quote shows one line; the rest of a long parent is never on screen. */
const QUOTE_MAX_LENGTH = 200;

@Component({
    selector: 'app-message-card',
    imports: [AvatarComponent, FormatDatePipe, FormatTimePipe, RouterLink, TooltipDirective, WikiContentComponent],
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
    },
})
export class MessageCardComponent {
    private readonly document = inject(DOCUMENT);

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

    /** The answered message, when it is among the loaded ones; the quote falls back to a label otherwise. */
    readonly parent = input<ForumMessage | undefined>(undefined);

    /**
     * `parentId` is absent on a root message, and absence is what decides
     * whether the «in reply to» link exists at all.
     */
    readonly replyLink = computed<MessageLink | undefined>(() => {
        const parentId = this.message().parentId;

        return parentId === undefined ? undefined : ['/', ...this.topicPath(), parentId];
    });

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
        return parent ? htmlToText(parent.html, this.document).slice(0, QUOTE_MAX_LENGTH) : undefined;
    });
}
