import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ForumTopicListItem } from '@drevo-web/shared';
import { AvatarComponent, FormatDatePipe, IconComponent, ShortDatePipe, TooltipDirective } from '@drevo-web/ui';

/**
 * A page of forum topics. Presentational: the forum section pages and the
 * article's discussion tab own the fetching and hand the rows over.
 */
@Component({
    selector: 'app-topic-list',
    imports: [
        AvatarComponent,
        FormatDatePipe,
        IconComponent,
        RouterLink,
        RouterLinkActive,
        ShortDatePipe,
        TooltipDirective,
    ],
    templateUrl: './topic-list.component.html',
    styleUrl: './topic-list.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopicListComponent {
    /**
     * Whether a topic is addressed under the list's own route. The article's
     * discussion tab opens topics inside the article; the forum keeps them at
     * the canonical `/forum/topic/:id`.
     */
    readonly relativeLinks = input(false);

    protected readonly newsSectionId = 'news';

    topicLink(topicId: number): readonly (string | number)[] {
        return this.relativeLinks() ? ['topic', topicId] : ['/forum/topic', topicId];
    }

    readonly items = input.required<readonly ForumTopicListItem[]>();
}
