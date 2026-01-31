import { ArticlesHistoryComponent } from './tabs/articles-history.component';
import { ForumHistoryComponent } from './tabs/forum-history.component';
import { NewsHistoryComponent } from './tabs/news-history.component';
import { PicturesComponent } from './tabs/pictures.component';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { TabItem, TabsComponent } from '@drevo-web/ui';
import { map } from 'rxjs';

const HISTORY_TABS: TabItem[] = [
    { label: 'Статьи', route: '/articles/history' },
    { label: 'Новости', route: '/news/history' },
    { label: 'Сообщения', route: '/forum/history' },
    { label: 'Иллюстрации', route: '/pictures' },
];

@Component({
    selector: 'app-history',
    imports: [
        TabsComponent,
        ArticlesHistoryComponent,
        NewsHistoryComponent,
        PicturesComponent,
        ForumHistoryComponent,
    ],
    templateUrl: './history.component.html',
    styleUrl: './history.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryComponent {
    private readonly route = inject(ActivatedRoute);

    readonly tabs = HISTORY_TABS;
    readonly activeTab = toSignal(
        this.route.data.pipe(map(data => data['activeTab'] as string)),
        { initialValue: 'articles' }
    );
}
