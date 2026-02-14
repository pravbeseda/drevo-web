import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { APPROVAL_CLASS, APPROVAL_ICONS, APPROVAL_TITLES, ArticleHistoryItem } from '@drevo-web/shared';
import { ButtonComponent, FormatTimePipe, IconButtonComponent, IconComponent } from '@drevo-web/ui';

@Component({
    selector: 'app-articles-history-item',
    imports: [IconComponent, RouterLink, FormatTimePipe, NgClass, IconButtonComponent, ButtonComponent],
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

    readonly approvalClass = computed(() => APPROVAL_CLASS[this.item().approved]);
    readonly statusIcon = computed(() => APPROVAL_ICONS[this.approvalClass()]);
    readonly statusTitle = computed(() => APPROVAL_TITLES[this.approvalClass()]);
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
