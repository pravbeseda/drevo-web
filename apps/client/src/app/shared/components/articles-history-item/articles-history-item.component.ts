import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArticleHistoryItem } from '@drevo-web/shared';
import { ButtonComponent, FormatTimePipe, IconButtonComponent, StatusIconComponent } from '@drevo-web/ui';

@Component({
    selector: 'app-articles-history-item',
    imports: [StatusIconComponent, RouterLink, FormatTimePipe, IconButtonComponent, ButtonComponent],
    templateUrl: './articles-history-item.component.html',
    styleUrl: './articles-history-item.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticlesHistoryItemComponent {
    readonly item = input.required<ArticleHistoryItem>();
    readonly selected = input(false);
    readonly selectable = input(false);
    readonly canCompare = input(false);

    readonly selectItem = output<ArticleHistoryItem>();
    readonly compare = output<void>();

    readonly diffLink = computed(() => ['/history/articles/diff', this.item().versionId]);

    onItemClick(): void {
        if (this.selectable()) {
            this.selectItem.emit(this.item());
        }
    }

    onCompareClick(event: Event): void {
        event.stopPropagation();
        this.compare.emit();
    }
}
