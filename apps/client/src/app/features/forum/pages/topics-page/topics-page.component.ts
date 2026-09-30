import { ForumService } from '../../../../services/forum/forum.service';
import { ErrorComponent } from '../../../../shared/components/error/error.component';
import { NEW_TOPIC_TARGET, NewTopicTarget } from '../../../../shared/components/new-topic-page/new-topic-target';
import { TopicListComponent } from '../../../../shared/components/topic-list/topic-list.component';
import { TopicPanesComponent } from '../../../../shared/components/topic-panes/topic-panes.component';
import { readForumSectionParams } from '../../../../shared/helpers/forum-route-params';
import { TopicListPagesService } from '../../../../shared/services/topic-list-pages/topic-list-pages.service';
import { ForumFilterComponent } from '../../components/forum-filter/forum-filter.component';
import { ForumSectionsResolveResult } from '../../resolvers/forum-sections.resolver';
import { ForumTopicsResolveResult } from '../../resolvers/forum-topics.resolver';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { ForumSection, ForumTopicListResponse } from '@drevo-web/shared';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

/** The parent route resolves the sections; a list reached without it has none. */
const NO_SECTIONS: readonly ForumSection[] = [];

@Component({
    selector: 'app-topics-page',
    imports: [ErrorComponent, ForumFilterComponent, TopicListComponent, TopicPanesComponent],
    templateUrl: './topics-page.component.html',
    styleUrl: './topics-page.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        TopicListPagesService,
        // The form opens in this list's panel, so it starts the topic in the section the list shows.
        { provide: NEW_TOPIC_TARGET, useFactory: () => inject(TopicsPageComponent).newTopicTarget },
    ],
})
export class TopicsPageComponent {
    private readonly route = inject(ActivatedRoute);
    private readonly forumService = inject(ForumService);
    protected readonly pages = inject(TopicListPagesService);

    /**
     * Whether this list carries the topic panel. `/forum/:part/:partId` — one
     * article's discussions — turns it off through its route data: a topic
     * opened from there belongs to `/forum/topic/:id`, not to a third address.
     *
     * Read from the data rather than bound as an input: `withComponentInputBinding`
     * writes every declared input on every navigation, and a route that names
     * no `withPanel` would hand the component `undefined` over its default.
     */
    readonly withPanel = toSignal(this.route.data.pipe(map(data => data['withPanel'] !== false)), {
        initialValue: true,
    });

    private readonly _resolveResult = signal<ForumTopicsResolveResult | undefined>(undefined);

    readonly hasTopicList = computed(() => typeof this._resolveResult() === 'object');
    readonly isNotFound = computed(() => this._resolveResult() === 'not-found');
    readonly isLoadError = computed(() => this._resolveResult() === 'load-error');

    /**
     * The section's own description, resolved by the parent route.
     *
     * The section comes from the params rather than from the snapshot alone:
     * switching sections reuses this component, and a snapshot read inside a
     * `computed` is not a dependency, so the description would stay on the
     * section the reader arrived at.
     */
    readonly sectionDescription = computed(() => {
        const part = this.part();

        return part ? this.sections().find(section => section.id === part)?.description : undefined;
    });

    readonly newTopicTarget = computed<NewTopicTarget>(() => ({
        part: this.part(),
        partId: undefined,
        ownerTitle: undefined,
    }));

    readonly newTopicLink = computed(() => {
        const part = this.part();
        return part ? `/forum/${part}/new` : '/forum/new';
    });

    /** The section the list shows; absent while it shows every topic. */
    readonly part = toSignal(this.route.params.pipe(map(() => readForumSectionParams(this.route.snapshot)?.part)), {
        initialValue: readForumSectionParams(this.route.snapshot)?.part,
    });

    readonly sections = toSignal(
        this.route.parent?.data.pipe(
            map((data): readonly ForumSection[] => {
                const result = data['sections'] as ForumSectionsResolveResult | undefined;

                return typeof result === 'object' ? result : NO_SECTIONS;
            }),
        ) ?? of(NO_SECTIONS),
        { initialValue: NO_SECTIONS },
    );

    constructor() {
        // A new resolve — the reader moved to another section, which reuses
        // this component — starts the pages over, dropping one still in flight.
        this.route.data
            .pipe(
                map(data => data['topics'] as ForumTopicsResolveResult),
                takeUntilDestroyed(),
            )
            .subscribe(result => {
                this._resolveResult.set(result);
                this.pages.reset(typeof result === 'object' ? result : undefined, page => this.fetchPage(page));
            });
    }

    /**
     * The address the resolver was given decides which section is paged, read
     * through the same function the resolver used. A section it refuses cannot
     * reach here: the resolver answered `'not-found'` and there is no list to
     * page through.
     */
    private fetchPage(page: number): Observable<ForumTopicListResponse> {
        const section = readForumSectionParams(this.route.snapshot);

        return this.forumService.getTopics(section?.part, section?.partId, page);
    }
}
