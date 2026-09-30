import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { LoggerService } from '@drevo-web/core';
import { ForumSection } from '@drevo-web/shared';
import {
    DropdownMenuComponent,
    DropdownMenuItemComponent,
    DropdownMenuTriggerDirective,
    IconButtonComponent,
} from '@drevo-web/ui';

/** Narrows the forum's topic list to one section, or widens it back to every topic. */
@Component({
    selector: 'app-forum-filter',
    imports: [DropdownMenuComponent, DropdownMenuItemComponent, DropdownMenuTriggerDirective, IconButtonComponent],
    templateUrl: './forum-filter.component.html',
    styleUrl: './forum-filter.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForumFilterComponent {
    private readonly router = inject(Router);
    private readonly logger = inject(LoggerService).withContext('ForumFilter');

    readonly sections = input.required<readonly ForumSection[]>();
    /** The section the list shows; absent while it shows every topic. */
    readonly current = input<string | undefined>(undefined);

    readonly currentName = computed(() => this.sections().find(section => section.id === this.current())?.name);

    select(part: string | undefined): void {
        this.logger.info('Forum section picked', { part });
        void this.router.navigate(part ? ['/forum', part] : ['/forum']);
    }
}
