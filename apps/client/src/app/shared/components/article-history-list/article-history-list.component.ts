import { ArticleHistoryService, trackByFn } from '../../../services/articles/article-history/article-history.service';
import { ArticlesHistoryItemComponent } from '../articles-history-item/articles-history-item.component';
import { InworkItemComponent } from '../inwork-item/inwork-item.component';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { ArticleHistoryItem } from '@drevo-web/shared';
import { SpinnerComponent, VirtualScrollerComponent, VirtualScrollerItemDirective } from '@drevo-web/ui';

@Component({
    selector: 'app-article-history-list',
    imports: [
        ArticlesHistoryItemComponent,
        InworkItemComponent,
        SpinnerComponent,
        VirtualScrollerComponent,
        VirtualScrollerItemDirective,
    ],
    templateUrl: './article-history-list.component.html',
    styleUrl: './article-history-list.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleHistoryListComponent {
    readonly selectedVersionIds = input<ReadonlySet<number>>(new Set());
    readonly selectable = input(false);
    readonly canCompare = input(false);

    readonly selectItem = output<ArticleHistoryItem>();
    readonly compareItems = output<void>();

    protected readonly service = inject(ArticleHistoryService);
    protected readonly trackByFn = trackByFn;

    onCancelInwork(title: string): void {
        this.service.onCancelInwork(title);
    }
}
