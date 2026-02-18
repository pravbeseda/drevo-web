import {
    ArticleHistoryService,
    HistoryFilter,
} from '../../../../services/articles/article-history/article-history.service';
import { ArticleHistoryListComponent } from '../../../../shared/components/article-history-list/article-history-list.component';
import { FiltersSidePanelComponent } from '../../../../shared/components/filters/filters-side-panel/filters-side-panel.component';
import { FilterEntry } from '../../../../shared/models/filter.model';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';

const BASE_FILTERS: readonly FilterEntry<HistoryFilter>[] = [
    { key: 'all', label: 'Все' },
    { key: 'unchecked', label: 'Непроверенные' },
    {
        label: 'В работе',
        items: [
            { key: 'unfinished', label: 'Неоконченные' },
            { key: 'unmarked', label: 'Неразмеченные' },
            { key: 'outside_dictionaries', label: 'Вне словников' },
            { key: 'required', label: 'Требующиеся' },
        ],
    },
];

@Component({
    selector: 'app-articles-history',
    imports: [ArticleHistoryListComponent, FiltersSidePanelComponent],
    templateUrl: './articles-history.component.html',
    styleUrl: './articles-history.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [ArticleHistoryService],
})
export class ArticlesHistoryComponent implements OnInit {
    private readonly service = inject(ArticleHistoryService);

    readonly activeFilter = this.service.activeFilter;

    readonly filters = computed<readonly FilterEntry<HistoryFilter>[]>(() => {
        if (this.service.isAuthenticated()) {
            return [...BASE_FILTERS, { key: 'my', label: 'Мои' }];
        }
        return BASE_FILTERS;
    });

    ngOnInit(): void {
        this.service.init();
    }

    onFilterChange(filter: HistoryFilter): void {
        this.service.onFilterChange(filter);
    }
}
