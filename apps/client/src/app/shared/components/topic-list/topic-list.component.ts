import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ForumTopicListItem } from '@drevo-web/shared';
import { FormatDatePipe, IconComponent } from '@drevo-web/ui';

/**
 * A page of forum topics. Presentational: the forum section pages and the
 * article's discussion tab own the fetching and hand the rows over.
 */
@Component({
    selector: 'app-topic-list',
    imports: [FormatDatePipe, IconComponent, RouterLink],
    templateUrl: './topic-list.component.html',
    styleUrl: './topic-list.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopicListComponent {
    readonly items = input.required<readonly ForumTopicListItem[]>();
}
