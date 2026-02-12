import { FilterEntry } from '../../../../../components/filters/filter.model';
import { FiltersComponent } from '../../../../../components/filters/filters.component';
import {
    ArticleHistoryService,
    HistoryFilter,
} from '../../../../../services/articles/article-history/article-history.service';
import { ArticleHistoryListComponent } from '../article-history-list/article-history-list.component';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    OnInit,
    signal,
} from '@angular/core';
import { SidePanelComponent, SidebarActionDirective } from '@drevo-web/ui';

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
    imports: [
        FiltersComponent,
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

    readonly filters = computed<readonly FilterEntry<HistoryFilter>[]>(() => {
        if (this.service.isAuthenticated()) {
            return [...BASE_FILTERS, { key: 'my', label: 'Мои' }];
        }
        return BASE_FILTERS;
    });

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
