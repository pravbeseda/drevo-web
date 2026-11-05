import {
    ArticleHistoryService,
    HistoryFilter,
} from '../../../../services/articles/article-history/article-history.service';
import { ArticleHistoryListComponent } from '../../../../shared/components/article-history-list/article-history-list.component';
import { FiltersSidePanelComponent } from '../../../../shared/components/filters/filters-side-panel/filters-side-panel.component';
import { SidebarActionComponent } from '../../../../shared/components/sidebar-action/sidebar-action.component';
import { FilterEntry } from '../../../../shared/models/filter.model';
import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit } from '@angular/core';
import { PageKind } from '@drevo-web/shared';

const BASE_FILTERS: readonly FilterEntry<HistoryFilter>[] = [
    { key: 'all', label: 'Все' },
    { key: 'unchecked', label: 'Непроверенные' },
];

@Component({
    selector: 'app-page-history',
    imports: [ArticleHistoryListComponent, FiltersSidePanelComponent, SidebarActionComponent],
    templateUrl: './page-history.component.html',
    styleUrl: './page-history.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [ArticleHistoryService],
})
export class PageHistoryComponent implements OnInit {
    private readonly service = inject(ArticleHistoryService);

    /** Whose versions the tab lists, from the route's data. */
    readonly kind = input.required<PageKind>();

    readonly activeFilter = this.service.activeFilter;
    readonly hideCancelled = this.service.hideCancelled;

    /** A signed-in reader may add a news item; the editor lives at /news/new. */
    readonly canAddNews = computed(() => this.kind() === 'news' && this.service.isAuthenticated());

    readonly filters = computed<readonly FilterEntry<HistoryFilter>[]>(() => {
        if (this.service.isAuthenticated()) {
            return [...BASE_FILTERS, { key: 'my', label: 'Мои' }];
        }
        return BASE_FILTERS;
    });

    ngOnInit(): void {
        this.service.init({ kind: this.kind() });
    }

    onFilterChange(filter: HistoryFilter): void {
        this.service.onFilterChange(filter);
    }

    onHideCancelledChange(value: boolean): void {
        this.service.onHideCancelledChange(value);
    }
}
