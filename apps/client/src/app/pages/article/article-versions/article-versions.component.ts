import { ArticleFiltersComponent } from '../../../components/article-filters/article-filters.component';
import {
    ArticleHistoryService,
    HistoryFilter,
} from '../../../services/articles/article-history/article-history.service';
import { ArticleHistoryListComponent } from '../../history/tabs/articles/article-history-list/article-history-list.component';
import { ArticlePageService } from '../article-page.service';
import {
    ChangeDetectionStrategy,
    Component,
    inject,
    OnInit,
    signal,
} from '@angular/core';
import { SidebarActionDirective, SidePanelComponent } from '@drevo-web/ui';

@Component({
    selector: 'app-article-versions',
    imports: [
        ArticleHistoryListComponent,
        SidebarActionDirective,
        ArticleFiltersComponent,
        SidePanelComponent,
    ],
    templateUrl: './article-versions.component.html',
    styleUrl: './article-versions.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [ArticleHistoryService],
})
export class ArticleVersionsComponent implements OnInit {
    private readonly service = inject(ArticleHistoryService);
    private readonly articlePageService = inject(ArticlePageService);

    readonly isSidePanelOpen = signal(false);
    readonly activeFilter = this.service.activeFilter;
    readonly canFilterByAuthor = this.service.canFilterByAuthor;

    ngOnInit(): void {
        this.service.init({ articleId: this.articlePageService.articleId });
    }

    openFilters(): void {
        this.isSidePanelOpen.update(v => !v);
    }

    onFilterChange(filter: HistoryFilter): void {
        this.service.onFilterChange(filter);
    }
}
