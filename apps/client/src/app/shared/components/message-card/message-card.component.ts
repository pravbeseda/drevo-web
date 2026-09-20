import { WikiContentComponent } from '../wiki-content/wiki-content.component';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ForumMessage } from '@drevo-web/shared';
import { FormatDatePipe } from '@drevo-web/ui';

/** What `routerLink` takes for the topic's address plus the message it anchors on. */
type MessageLink = readonly (string | number)[];

@Component({
    selector: 'app-message-card',
    imports: [FormatDatePipe, RouterLink, WikiContentComponent],
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
    },
})
export class MessageCardComponent {
    readonly message = input.required<ForumMessage>();

    /**
     * The topic's own address, as path segments — `['forum', 'topic', '42']` in the
     * forum, `['articles', '7', 'forum', 'topic', '42']` inside an article. The
     * card appends the answered message to it rather than knowing where topics
     * live, which differs between the two places this card is mounted.
     */
    readonly topicPath = input.required<readonly string[]>();
    readonly anchored = input(false);

    /**
     * `parentId` is absent on a root message, and absence is what decides
     * whether the «in reply to» link exists at all.
     */
    readonly replyLink = computed<MessageLink | undefined>(() => {
        const parentId = this.message().parentId;

        return parentId === undefined ? undefined : ['/', ...this.topicPath(), parentId];
    });

    protected readonly elementId = computed(() => `message-${this.message().id}`);
}
