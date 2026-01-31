import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'app-forum-history',
    template: '<p>Сообщения — в разработке</p>',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForumHistoryComponent {}
