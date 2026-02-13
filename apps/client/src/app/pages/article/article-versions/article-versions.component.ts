import { FilterEntry } from '../../../components/filters/filter.model';
import { FiltersSidePanelComponent } from '../../../components/filters/filters-side-panel/filters-side-panel.component';
import {
    ArticleHistoryService,
    HistoryFilter,
} from '../../../services/articles/article-history/article-history.service';
import { ArticleHistoryListComponent } from '../../history/tabs/articles/article-history-list/article-history-list.component';
import { ArticlePageService } from '../article-page.service';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';

@Component({
    selector: 'app-article-versions',
    imports: [ArticleHistoryListComponent, FiltersSidePanelComponent],
    templateUrl: './article-versions.component.html',
    styleUrl: './article-versions.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [ArticleHistoryService],
})
export class ArticleVersionsComponent implements OnInit {
    private readonly service = inject(ArticleHistoryService);
    private readonly articlePageService = inject(ArticlePageService);

    readonly activeFilter = this.service.activeFilter;

    readonly filters = computed<readonly FilterEntry<HistoryFilter>[]>(() => {
        const entries: FilterEntry<HistoryFilter>[] = [
            { key: 'all', label: 'Все' },
            { key: 'unchecked', label: 'Непроверенные' },
        ];
        if (this.service.isAuthenticated()) {
            entries.push({ key: 'my', label: 'Мои' });
        }
        return entries;
    });

    ngOnInit(): void {
        this.service.init({ articleId: this.articlePageService.articleId });
    }

    onFilterChange(filter: HistoryFilter): void {
        this.service.onFilterChange(filter);
    }
}
