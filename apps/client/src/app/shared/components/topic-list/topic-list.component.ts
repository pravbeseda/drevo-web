import { AuthService } from '../../../services/auth/auth.service';
import { ForumDraftService } from '../../../services/forum/forum-draft.service';
import { ForumReadService } from '../../../services/forum/forum-read.service';
import { draftExcerpt } from '../../helpers/draft-excerpt';
import { forumOwnerPrefix } from '../../helpers/forum-owner';
import { TopicListLoadState } from '../../services/topic-list-pages/topic-list-pages.service';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ForumReadState, ForumTopicListItem } from '@drevo-web/shared';
import { AvatarComponent } from '@drevo-web/ui/avatar';
import { BadgeComponent } from '@drevo-web/ui/badge';
import { ButtonComponent } from '@drevo-web/ui/button';
import { FormatDatePipe } from '@drevo-web/ui/format-date';
import { IconComponent } from '@drevo-web/ui/icon';
import { ShortDatePipe } from '@drevo-web/ui/short-date';
import { TooltipDirective } from '@drevo-web/ui/tooltip';
import { VirtualScrollerComponent, VirtualScrollerItemDirective } from '@drevo-web/ui/virtual-scroller';
import { map } from 'rxjs';

/** The first word of a name, or the first two when the first is an abbreviation such as «о.» or «свящ.». */
function shortName(fullName: string): string | undefined {
    const words = fullName.split(/\s+/).filter(word => word !== '');
    const first = words.at(0);
    const second = words.at(1);
    return first?.endsWith('.') && second !== undefined ? `${first} ${second}` : first;
}

/**
 * The loaded forum topics, rendered as the reader scrolls to them.
 * Presentational: the forum section pages and the article's discussion tab
 * own the fetching and hand the rows over.
 */
@Component({
    selector: 'app-topic-list',
    imports: [
        AvatarComponent,
        BadgeComponent,
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

    private readonly readStates = inject(ForumReadService).states;

    /** The excerpt of the unsent reply, by topic id. */
    protected readonly draftExcerpts = computed(
        () => new Map([...this.drafts()].map(([topicId, text]) => [topicId, draftExcerpt(text)])),
    );

    protected readonly trackById = (_index: number, topic: ForumTopicListItem): number => topic.id;

    /** What is unread in the topic: as the reader has read it since the list was loaded, or as the list says. */
    protected readState(topic: ForumTopicListItem): ForumReadState {
        return this.readStates().get(topic.id) ?? topic;
    }

    /** The topic, opened on its first unread message when it has one. */
    protected topicLink(topicId: number, firstUnreadId: number | undefined): readonly (string | number)[] {
        const link = this.relativeLinks() ? ['topic', topicId] : ['/forum/topic', topicId];
        return firstUnreadId === undefined ? link : [...link, firstUnreadId];
    }

    /** Who wrote the last message: «Вы» for the reader, otherwise the name cut short. */
    protected lastAuthorName(topic: ForumTopicListItem): string | undefined {
        return this.isOwnLastPost(topic) ? 'Вы' : shortName(topic.lastAuthor ?? '');
    }

    private isOwnLastPost(topic: ForumTopicListItem): boolean {
        const ownLogin = this.ownLogin();
        return ownLogin !== undefined && topic.lastAuthorLogin === ownLogin;
    }
}
