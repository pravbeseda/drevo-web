import { ForumSectionsResolveResult } from '../../resolvers/forum-sections.resolver';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterOutlet } from '@angular/router';
import { ForumSection } from '@drevo-web/shared';
import { TabItem, TabsComponent } from '@drevo-web/ui';
import { map } from 'rxjs/operators';

/** `/forum` itself, which the topic list of every section answers. */
const ALL_TOPICS_TAB: TabItem = { label: 'Все темы', route: '/forum', exact: true, testId: 'forum-tab-all' };

/**
 * The forum shell: the section tabs and the topic list they switch between.
 * The sections arrive resolved, so a section a reader opens directly renders
 * its tab bar in the same pass as its list.
 */
@Component({
    selector: 'app-forum-page',
    imports: [RouterOutlet, TabsComponent],
    templateUrl: './forum-page.component.html',
    styleUrl: './forum-page.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForumPageComponent {
    private readonly route = inject(ActivatedRoute);

    private readonly resolveResult = toSignal(
        this.route.data.pipe(map(data => data['sections'] as ForumSectionsResolveResult)),
    );

    /**
     * A failed section request costs the reader the tabs, not the forum: the
     * topic list resolves on its own and «all topics» is the address it answers.
     */
    readonly tabs = computed<TabItem[]>(() => {
        const result = this.resolveResult();
        const sections: readonly ForumSection[] = typeof result === 'object' ? result : [];

        return [
            ALL_TOPICS_TAB,
            ...sections.map(section => ({
                label: section.name,
                route: `/forum/${section.id}`,
                tooltip: section.description,
                testId: `forum-tab-${section.id}`,
            })),
        ];
    });
}
