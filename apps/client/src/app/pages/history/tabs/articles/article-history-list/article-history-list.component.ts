import {
    ArticleHistoryService,
    trackByFn,
} from '../../../../../services/articles/article-history/article-history.service';
import { ArticlesHistoryItemComponent } from '../articles-history-item/articles-history-item.component';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SpinnerComponent, VirtualScrollerComponent, VirtualScrollerItemDirective } from '@drevo-web/ui';

@Component({
    selector: 'app-article-history-list',
    imports: [ArticlesHistoryItemComponent, SpinnerComponent, VirtualScrollerComponent, VirtualScrollerItemDirective],
    templateUrl: './article-history-list.component.html',
    styleUrl: './article-history-list.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleHistoryListComponent {
    protected readonly service = inject(ArticleHistoryService);
    protected readonly trackByFn = trackByFn;
}
