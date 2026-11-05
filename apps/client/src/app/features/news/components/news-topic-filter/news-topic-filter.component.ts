import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { LoggerService } from '@drevo-web/core';
import { NewsTopic } from '@drevo-web/shared';
import {
    DropdownMenuComponent,
    DropdownMenuItemComponent,
    DropdownMenuTriggerDirective,
} from '@drevo-web/ui/dropdown-menu';
import { IconButtonComponent } from '@drevo-web/ui/icon-button';

/** Narrows the news feed to one section, or widens it back to every section. */
@Component({
    selector: 'app-news-topic-filter',
    imports: [DropdownMenuComponent, DropdownMenuItemComponent, DropdownMenuTriggerDirective, IconButtonComponent],
    templateUrl: './news-topic-filter.component.html',
    styleUrl: './news-topic-filter.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewsTopicFilterComponent {
    private readonly router = inject(Router);
    private readonly logger = inject(LoggerService).withContext('NewsTopicFilter');

    readonly topics = input.required<readonly NewsTopic[]>();
    /** The section the feed shows; absent while it shows every section. */
    readonly current = input<number | undefined>(undefined);

    readonly currentTitle = computed(() => this.topics().find(topic => topic.id === this.current())?.title);

    select(topic: number | undefined): void {
        this.logger.info('News section picked', { topic });
        void this.router.navigate(['/news'], { queryParams: { topic } });
    }
}
