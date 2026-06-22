import { ReviewBadgeComponent } from '../review-badge/review-badge.component';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArticleHistoryItem, ReviewSummary } from '@drevo-web/shared';
import {
    ButtonComponent,
    FormatTimePipe,
    IconButtonComponent,
    IconComponent,
    StatusIconComponent,
} from '@drevo-web/ui';

@Component({
    selector: 'app-articles-history-item',
    imports: [
        StatusIconComponent,
        RouterLink,
        FormatTimePipe,
        IconButtonComponent,
        IconComponent,
        ButtonComponent,
        ReviewBadgeComponent,
    ],
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
    readonly reviewSummary = input<ReviewSummary>();

    readonly selectItem = output<ArticleHistoryItem>();
    readonly compare = output<void>();

    readonly diffLink = computed(() => ['/history/articles/diff', this.item().versionId]);

    readonly versionLink = computed(() => ['/articles', this.item().articleId, 'version', this.item().versionId]);

    /**
     * Where the review pill navigates: the version's diff, or — for new versions
     * (nothing to compare against) — the version page itself. Mirrors legacy.
     */
    readonly reviewLink = computed(() => (this.item().isNew ? this.versionLink() : this.diffLink()));

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
