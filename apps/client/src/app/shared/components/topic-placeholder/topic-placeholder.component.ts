import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The right pane before a topic is opened. It carries the section's own
 * description, which the forum fetches for the tabs and shows nowhere else.
 */
@Component({
    selector: 'app-topic-placeholder',
    templateUrl: './topic-placeholder.component.html',
    styleUrl: './topic-placeholder.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopicPlaceholderComponent {
    readonly description = input<string | undefined>(undefined);
}
