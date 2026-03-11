import { ModerationSidebarActionComponent } from '../../../../shared/components/moderation-sidebar-action/moderation-sidebar-action.component';
import { SidebarActionComponent } from '../../../../shared/components/sidebar-action/sidebar-action.component';
import { TopicsSidebarActionComponent } from '../../../../shared/components/topics-sidebar-action/topics-sidebar-action.component';
import { VersionForModeration } from '../../../../shared/models/version-for-moderation.model';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { NotificationService } from '@drevo-web/core';
import { ModerationResult } from '@drevo-web/shared';

@Component({
    selector: 'app-article-sidebar-actions',
    imports: [SidebarActionComponent, ModerationSidebarActionComponent, TopicsSidebarActionComponent],
    templateUrl: './article-sidebar-actions.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleSidebarActionsComponent {
    readonly version = input<VersionForModeration>();
    readonly editUrl = input<string>();
    readonly articleId = input<number>();
    readonly topics = input<ReadonlyArray<number>>();
    readonly moderated = output<ModerationResult>();
    readonly topicsChanged = output<ReadonlyArray<number>>();

    private readonly notification = inject(NotificationService);

    openTableOfContents(): void {
        this.notification.info('Функция еще не реализована');
    }
}
