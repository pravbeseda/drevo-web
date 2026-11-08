import { CountsService, HistoryCounts } from '../../../../services/counts/counts.service';
import { SidebarReserveComponent } from '../../../../shared/components/sidebar-reserve/sidebar-reserve.component';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TabItem, TabsComponent } from '@drevo-web/ui/tabs';

const BASE_TABS: readonly TabItem[] = [
    { label: 'Статьи', route: '/history/articles', testId: 'history-tab-articles' },
    { label: 'Новости', route: '/history/news', testId: 'history-tab-news' },
    { label: 'Иллюстрации', route: '/history/pictures', testId: 'history-tab-pictures' },
];

@Component({
    selector: 'app-history',
    imports: [TabsComponent, RouterOutlet, SidebarReserveComponent],
    templateUrl: './history.component.html',
    styleUrl: './history.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryComponent {
    private readonly countsService = inject(CountsService);

    readonly tabs = computed<TabItem[]>(() => {
        const counts = this.countsService.historyCounts();
        if (!counts) return [...BASE_TABS];

        return BASE_TABS.map(tab => {
            const badge = this.getBadge(tab.route, counts);
            return badge > 0 ? { ...tab, badge } : tab;
        });
    });

    private getBadge(route: string, counts: HistoryCounts): number {
        switch (route) {
            case '/history/articles':
                return counts.pendingArticles;
            case '/history/news':
                return counts.pendingNews;
            case '/history/pictures':
                return counts.pendingPictures;
            default:
                return 0;
        }
    }
}
