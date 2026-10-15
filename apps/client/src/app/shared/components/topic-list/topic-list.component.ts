import { AuthService } from '../../../services/auth/auth.service';
import { ForumDraftService } from '../../../services/forum/forum-draft.service';
import { draftExcerpt } from '../../helpers/draft-excerpt';
import { forumOwnerPrefix } from '../../helpers/forum-owner';
import { TopicListLoadState } from '../../services/topic-list-pages/topic-list-pages.service';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ForumTopicListItem } from '@drevo-web/shared';
import {
    AvatarComponent,
    ButtonComponent,
    FormatDatePipe,
    IconComponent,
    ShortDatePipe,
    TooltipDirective,
    VirtualScrollerComponent,
    VirtualScrollerItemDirective,
} from '@drevo-web/ui';
import { map } from 'rxjs';

/**
 * The loaded forum topics, rendered as the reader scrolls to them.
 * Presentational: the forum section pages and the article's discussion tab
 * own the fetching and hand the rows over.
 */
@Component({
    selector: 'app-topic-list',
    imports: [
        AvatarComponent,
        ButtonComponent,
        FormatDatePipe,
        IconComponent,
        RouterLink,
        RouterLinkActive,
        ShortDatePipe,
        TooltipDirective,
        VirtualScrollerComponent,
        VirtualScrollerItemDirective,
    ],
    templateUrl: './topic-list.component.html',
    styleUrl: './topic-list.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopicListComponent {
    readonly items = input.required<readonly ForumTopicListItem[]>();

    /** How many topics the whole list holds, loaded or not. */
    readonly total = input<number>(0);

    readonly loadState = input<TopicListLoadState>('idle');

    /**
     * Whether a topic is addressed under the list's own route. The article's
     * discussion tab opens topics inside the article; the forum keeps them at
     * the canonical `/forum/topic/:id`.
     */
    readonly relativeLinks = input(false);

    /** The reader scrolled near the end of the loaded rows. */
    readonly loadMore = output();

    /** The reader asked to load the failed page again. */
    readonly retry = output();

    protected readonly ownerPrefix = forumOwnerPrefix;

    private readonly ownLogin = toSignal(inject(AuthService).user$.pipe(map(user => user?.login)));

    private readonly drafts = inject(ForumDraftService).drafts;

    /** The excerpt of the unsent reply, by topic id. */
    protected readonly draftExcerpts = computed(
        () => new Map([...this.drafts()].map(([topicId, text]) => [topicId, draftExcerpt(text)])),
    );

    protected readonly trackById = (_index: number, topic: ForumTopicListItem): number => topic.id;

    topicLink(topicId: number): readonly (string | number)[] {
        return this.relativeLinks() ? ['topic', topicId] : ['/forum/topic', topicId];
    }

    protected isOwnLastPost(topic: ForumTopicListItem): boolean {
        const ownLogin = this.ownLogin();
        return ownLogin !== undefined && topic.lastAuthorLogin === ownLogin;
    }
}
