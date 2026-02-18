import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'app-news-history',
    template: '<p>Новости — в разработке</p>',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewsHistoryComponent {}
