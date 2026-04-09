import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TabItem, TabsComponent } from '@drevo-web/ui';

const HISTORY_TABS: TabItem[] = [
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
    readonly tabs = HISTORY_TABS;
}
