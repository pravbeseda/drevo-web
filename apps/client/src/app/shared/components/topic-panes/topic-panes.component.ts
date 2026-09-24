import { TopicPlaceholderComponent } from '../topic-placeholder/topic-placeholder.component';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { ResizeHandleDirective, ScrollbarDirective } from '@drevo-web/ui';
import { filter, map } from 'rxjs/operators';

/**
 * A topic list beside the topic it opens. The list is projected, the panel is
 * this component's own child route: a wide container shows both, a narrow one
 * shows whichever the address names.
 */
@Component({
    selector: 'app-topic-panes',
    imports: [ResizeHandleDirective, RouterOutlet, ScrollbarDirective, TopicPlaceholderComponent],
    templateUrl: './topic-panes.component.html',
    styleUrl: './topic-panes.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopicPanesComponent {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);

    /** What the panel says before a topic is opened — the section's own description. */
    readonly description = input<string | undefined>(undefined);

    /**
     * Whether this list carries the panel at all. `/forum/:part/:partId` — one
     * article's discussions — turns it off: a topic opened from there belongs
     * to `/forum/topic/:id`, not to a third address.
     */
    readonly withPanel = input(true);

    /**
     * Whether the topic route under this list is activated. The outlet cannot
     * answer it — the panes need the answer to lay themselves out before the
     * outlet renders — so it comes from the router's own navigations.
     */
    readonly hasOpenTopic = toSignal(
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd),
            map(() => Boolean(this.route.firstChild)),
        ),
        { initialValue: Boolean(this.route.firstChild) },
    );
}
