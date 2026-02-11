import { ArticleFiltersComponent } from '../../../../../components/article-filters/article-filters.component';
import {
    ArticleHistoryService,
    HistoryFilter,
} from '../../../../../services/articles/article-history/article-history.service';
import { ArticleHistoryListComponent } from '../article-history-list/article-history-list.component';
import {
    ChangeDetectionStrategy,
    Component,
    inject,
    OnInit,
    signal,
} from '@angular/core';
import { SidePanelComponent, SidebarActionDirective } from '@drevo-web/ui';

@Component({
    selector: 'app-articles-history',
    imports: [
        ArticleFiltersComponent,
        ArticleHistoryListComponent,
        SidePanelComponent,
        SidebarActionDirective,
    ],
    templateUrl: './articles-history.component.html',
    styleUrl: './articles-history.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [ArticleHistoryService],
})
export class ArticlesHistoryComponent implements OnInit {
    private readonly service = inject(ArticleHistoryService);

    readonly isSidePanelOpen = signal(false);
    readonly activeFilter = this.service.activeFilter;
    readonly canFilterByAuthor = this.service.canFilterByAuthor;

    ngOnInit(): void {
        this.service.init();
    }

    openFilters(): void {
        this.isSidePanelOpen.update(v => !v);
    }

    onFilterChange(filter: HistoryFilter): void {
        this.service.onFilterChange(filter);
    }
}
