import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TabItem, TabsComponent } from '@drevo-web/ui';

const HISTORY_TABS: TabItem[] = [
    { label: 'Статьи', route: '/history/articles' },
    { label: 'Новости', route: '/history/news' },
    { label: 'Сообщения', route: '/history/forum' },
    { label: 'Иллюстрации', route: '/history/pictures' },
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
