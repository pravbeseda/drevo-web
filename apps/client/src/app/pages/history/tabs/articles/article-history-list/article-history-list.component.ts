import {
    ArticleHistoryService,
    trackByFn,
} from '../../../../../services/articles/article-history/article-history.service';
import { ArticlesHistoryItemComponent } from '../articles-history-item/articles-history-item.component';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
    SpinnerComponent,
    VirtualScrollerComponent,
    VirtualScrollerItemDirective,
} from '@drevo-web/ui';

@Component({
    selector: 'app-article-history-list',
    imports: [
        ArticlesHistoryItemComponent,
        SpinnerComponent,
        VirtualScrollerComponent,
        VirtualScrollerItemDirective,
    ],
    templateUrl: './article-history-list.component.html',
    styleUrl: './article-history-list.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleHistoryListComponent {
    protected readonly service = inject(ArticleHistoryService);
    protected readonly trackByFn = trackByFn;

    private readonly router = inject(Router);

    onViewDiff(versionId: number): void {
        this.router.navigate(['/history/diff', versionId]);
    }
}
