import { VersionForModeration } from '../../models/version-for-moderation.model';
import { ModerationSidebarActionComponent } from '../moderation-sidebar-action/moderation-sidebar-action.component';
import { SidebarActionComponent } from '../sidebar-action/sidebar-action.component';
import { TopicsSidebarActionComponent } from '../topics-sidebar-action/topics-sidebar-action.component';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { NotificationService } from '@drevo-web/core';
import { ApprovalStatus, ModerationResult, PageKind, SidebarActionPriority } from '@drevo-web/shared';

/** The sidebar actions of an article or a news item: contents, editing, topics (articles only), moderation. */
@Component({
    selector: 'app-page-sidebar-actions',
    imports: [SidebarActionComponent, ModerationSidebarActionComponent, TopicsSidebarActionComponent],
    templateUrl: './page-sidebar-actions.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageSidebarActionsComponent {
    readonly kind = input<PageKind>('articles');
    readonly version = input<VersionForModeration>();
    readonly editUrl = input<string>();
    readonly articleId = input<number>();
    readonly topics = input<ReadonlyArray<number>>();
    readonly moderated = output<ModerationResult>();
    readonly topicsChanged = output<ReadonlyArray<number>>();

    readonly isArticle = computed(() => this.kind() === 'articles');

    /** An article is moderated once it has dictionary topics; a news item has no such topics to wait for. */
    private readonly isReadyForModeration = computed(() => {
        const topics = this.topics();
        return !this.isArticle() || (!!topics && topics.length > 0);
    });

    readonly moderationPriority = computed<SidebarActionPriority>(() => {
        const isPending = this.version()?.approved === ApprovalStatus.Pending;
        return this.isReadyForModeration() && isPending ? 'primary' : 'secondary';
    });

    readonly moderationDisabled = computed(() => !this.isReadyForModeration());

    private readonly notification = inject(NotificationService);

    openTableOfContents(): void {
        this.notification.info('Функция еще не реализована');
    }
}
