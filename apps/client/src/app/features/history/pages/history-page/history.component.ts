import { AuthService } from '../../../../services/auth/auth.service';
import { HistoryCounts, HistoryCountsService } from '../../../../services/counts/history-counts.service';
import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';
import { TabItem, TabsComponent } from '@drevo-web/ui';

const BASE_TABS: readonly TabItem[] = [
    { label: 'Статьи', route: '/history/articles', testId: 'history-tab-articles' },
    { label: 'Новости', route: '/history/news', testId: 'history-tab-news' },
    { label: 'Сообщения', route: '/history/forum', testId: 'history-tab-forum' },
    { label: 'Иллюстрации', route: '/history/pictures', testId: 'history-tab-pictures' },
];

@Component({
    selector: 'app-history',
    imports: [TabsComponent, RouterOutlet],
    templateUrl: './history.component.html',
    styleUrl: './history.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryComponent {
    private readonly authService = inject(AuthService);
    private readonly historyCountsService = inject(HistoryCountsService);
    private readonly user = toSignal(this.authService.user$);
    private countsLoaded = false;

    readonly canModerate = computed(() => this.user()?.permissions.canModerate ?? false);

    readonly tabs = computed<TabItem[]>(() => {
        if (!this.canModerate()) return [...BASE_TABS];

        const counts = this.historyCountsService.counts();
        if (!counts) return [...BASE_TABS];

        return BASE_TABS.map(tab => {
            const badge = this.getBadge(tab.route, counts);
            return badge > 0 ? { ...tab, badge } : tab;
        });
    });

    constructor() {
        effect(() => {
            if (this.canModerate() && !this.countsLoaded) {
                this.countsLoaded = true;
                this.historyCountsService.loadCounts();
            }
        });
    }

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
