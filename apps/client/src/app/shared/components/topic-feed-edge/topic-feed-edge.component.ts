import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonComponent, InViewDirective, SpinnerComponent } from '@drevo-web/ui';

/**
 * Where an end of the feed stands. A failed end waits for the reader's retry:
 * it is still on screen, so loading on sight would retry in a loop.
 */
export type TopicFeedEdgeState = 'idle' | 'loading' | 'failed';

const SPINNER_DIAMETER = 24;

/** One end of a topic's feed, which loads the neighbouring page once the reader scrolls to it. */
@Component({
    selector: 'app-topic-feed-edge',
    imports: [ButtonComponent, InViewDirective, SpinnerComponent],
    templateUrl: './topic-feed-edge.component.html',
    styleUrl: './topic-feed-edge.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopicFeedEdgeComponent {
    readonly state = input.required<TopicFeedEdgeState>();
    readonly end = input.required<'previous' | 'next'>();
    readonly loadMore = output();

    protected readonly spinnerDiameter = SPINNER_DIAMETER;
}
