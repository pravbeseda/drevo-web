import { WikiContentComponent } from '../../../../shared/components/wiki-content/wiki-content.component';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ForumMessage } from '@drevo-web/shared';
import { FormatDatePipe } from '@drevo-web/ui';

/** What `routerLink` takes for `/forum/topic/:id/:messageId`. */
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
    readonly topicId = input.required<number>();
    readonly anchored = input(false);

    /**
     * `parentId` is absent on a root message, and absence is what decides
     * whether the «in reply to» link exists at all.
     */
    readonly replyLink = computed<MessageLink | undefined>(() => {
        const parentId = this.message().parentId;
        return parentId === undefined ? undefined : ['/forum/topic', this.topicId(), parentId];
    });

    protected readonly elementId = computed(() => `message-${this.message().id}`);
}
