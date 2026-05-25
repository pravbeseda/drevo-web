import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApprovalStatus, ArticleHistoryItem } from '@drevo-web/shared';
import {
    ButtonComponent,
    FormatTimePipe,
    IconButtonComponent,
    IconComponent,
    StatusIconComponent,
} from '@drevo-web/ui';

@Component({
    selector: 'app-articles-history-item',
    imports: [StatusIconComponent, RouterLink, FormatTimePipe, IconButtonComponent, IconComponent, ButtonComponent],
    templateUrl: './articles-history-item.component.html',
    styleUrl: './articles-history-item.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticlesHistoryItemComponent {
    readonly item = input.required<ArticleHistoryItem>();
    readonly selected = input(false);
    readonly selectable = input(false);
    readonly canCompare = input(false);
    readonly inwork = input(false);
    readonly currentUserName = input<string>();

    readonly selectItem = output<ArticleHistoryItem>();
    readonly compare = output<void>();
    readonly cancelVersion = output<ArticleHistoryItem>();

    readonly diffLink = computed(() => ['/history/articles/diff', this.item().versionId]);

    readonly canCancel = computed(() => {
        const item = this.item();
        const name = this.currentUserName();
        return !!name && item.author === name && item.approved === ApprovalStatus.Pending;
    });

    onItemClick(): void {
        if (this.selectable()) {
            this.selectItem.emit(this.item());
        }
    }

    onCompareClick(event: Event): void {
        event.stopPropagation();
        this.compare.emit();
    }

    onCancelClick(event: Event): void {
        event.stopPropagation();
        this.cancelVersion.emit(this.item());
    }
}
