import { BackLinkService } from '../../../services/back-link/back-link.service';
import { TopicPlaceholderComponent } from '../topic-placeholder/topic-placeholder.component';
import {
    afterNextRender,
    afterRenderEffect,
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ElementRef,
    inject,
    input,
    signal,
    viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { ButtonComponent, IconComponent, ResizeHandleDirective } from '@drevo-web/ui';
import { filter, map } from 'rxjs/operators';

/**
 * A topic list beside the topic it opens. The list is projected, the panel is
 * this component's own child route: a wide container shows both, a narrow one
 * shows whichever the address names.
 *
 * The list's toolbar carries «new topic» and, projected as `[panesToolbarEnd]`,
 * whatever the host adds at its other end.
 *
 * While an open topic hides the list — a container too narrow for both — the
 * header offers the way back to it. Whether the list is hidden is read off the
 * rendered list rather than recomputed, so the width lives in the styles alone.
 *
 * The list pane only gives the list its height: the list scrolls itself, since
 * a virtual list has to own the element it scrolls.
 */
@Component({
    selector: 'app-topic-panes',
    imports: [ButtonComponent, IconComponent, ResizeHandleDirective, RouterOutlet, TopicPlaceholderComponent],
    templateUrl: './topic-panes.component.html',
    styleUrl: './topic-panes.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopicPanesComponent {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly backLinkService = inject(BackLinkService);
    private readonly list = viewChild.required<ElementRef<HTMLElement>>('list');
    /** The container's width, tracked only so the check below reruns when it changes. */
    private readonly width = signal(0);
    private shownBackLink: string | undefined;

    /** What the panel says before a topic is opened — the section's own description. */
    readonly description = input<string | undefined>(undefined);

    /**
     * Whether this list carries the panel at all. `/forum/:part/:partId` — one
     * article's discussions — turns it off: a topic opened from there belongs
     * to `/forum/topic/:id`, not to a third address.
     */
    readonly withPanel = input(true);

    /**
     * Where «new topic» above the list leads; a list that offers none has no
     * such row, and neither has a list without the panel the form opens in.
     */
    readonly newTopicLink = input<string | undefined>(undefined);

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

    constructor() {
        const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
        const destroyRef = inject(DestroyRef);

        afterNextRender(() => {
            if (typeof ResizeObserver === 'undefined') {
                return;
            }
            const observer = new ResizeObserver(([entry]) => this.width.set(entry.contentRect.width));
            observer.observe(host);
            destroyRef.onDestroy(() => observer.disconnect());
        });

        afterRenderEffect(() => {
            this.width();
            const listHidden = this.hasOpenTopic() && this.list().nativeElement.offsetWidth === 0;
            this.showBackLink(listHidden ? this.listLink() : undefined);
        });

        destroyRef.onDestroy(() => this.showBackLink(undefined));
    }

    /** This list's own address, which is the route the panes are rendered for. */
    private listLink(): string {
        return this.router.serializeUrl(this.router.createUrlTree(['.'], { relativeTo: this.route }));
    }

    private showBackLink(link: string | undefined): void {
        if (link === this.shownBackLink) {
            return;
        }
        if (this.shownBackLink !== undefined) {
            this.backLinkService.hide(this.shownBackLink);
        }
        if (link !== undefined) {
            this.backLinkService.show(link);
        }
        this.shownBackLink = link;
    }
}
