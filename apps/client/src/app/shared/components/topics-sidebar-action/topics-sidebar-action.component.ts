import { ArticleService } from '../../../services/articles';
import { AuthService } from '../../../services/auth/auth.service';
import { SidebarActionComponent } from '../sidebar-action/sidebar-action.component';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { LoggerService, NotificationService } from '@drevo-web/core';
import { getTopicsByIds, TOPICS } from '@drevo-web/shared';
import { ButtonComponent, CheckboxComponent, IconComponent, SidePanelComponent } from '@drevo-web/ui';
import { finalize } from 'rxjs';

@Component({
    selector: 'app-topics-sidebar-action',
    imports: [
        FormsModule,
        SidebarActionComponent,
        SidePanelComponent,
        CheckboxComponent,
        ButtonComponent,
        IconComponent,
    ],
    templateUrl: './topics-sidebar-action.component.html',
    styleUrl: './topics-sidebar-action.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopicsSidebarActionComponent {
    readonly articleId = input.required<number>();
    readonly topics = input.required<ReadonlyArray<number>>();

    readonly topicsChanged = output<ReadonlyArray<number>>();

    private readonly authService = inject(AuthService);
    private readonly articleService = inject(ArticleService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly logger = inject(LoggerService).withContext('TopicsSidebarAction');
    private readonly notification = inject(NotificationService);

    private readonly user = toSignal(this.authService.user$);
    readonly canModerate = computed(() => this.user()?.permissions.canModerate ?? false);

    readonly firstTopicIcon = computed(() => {
        const topicIds = this.topics();
        if (topicIds.length === 0) {
            return undefined;
        }
        const matched = getTopicsByIds(topicIds);
        return matched.length > 0 ? matched[0].icon : undefined;
    });

    readonly topicCount = computed(() => this.topics().length);
    readonly topicBadge = computed(() => {
        const count = this.topicCount();
        return count > 1 ? count : undefined;
    });

    readonly topicsLabel = computed(() => {
        const matched = getTopicsByIds(this.topics());
        return matched.length > 0 ? matched.map(t => t.name).join('\n') : 'Укажите словник';
    });

    private readonly _isPanelOpen = signal(false);
    readonly isPanelOpen = this._isPanelOpen.asReadonly();

    private readonly _isSaving = signal(false);
    readonly isSaving = this._isSaving.asReadonly();

    private readonly _selectedTopics = signal<ReadonlySet<number>>(new Set());
    readonly selectedTopics = this._selectedTopics.asReadonly();

    protected readonly allTopics = TOPICS;

    togglePanel(): void {
        const isOpen = this._isPanelOpen();
        if (!isOpen) {
            this._selectedTopics.set(new Set(this.topics()));
        }
        this._isPanelOpen.set(!isOpen);
    }

    closePanel(): void {
        this._isPanelOpen.set(false);
    }

    onTopicToggle(topicId: number, checked: boolean): void {
        this._selectedTopics.update(current => {
            const next = new Set(current);
            if (checked) {
                next.add(topicId);
            } else {
                next.delete(topicId);
            }
            return next;
        });
    }

    save(): void {
        this._isSaving.set(true);
        const articleId = this.articleId();
        const topics = [...this._selectedTopics()];

        this.articleService
            .updateTopics(articleId, topics)
            .pipe(
                finalize(() => this._isSaving.set(false)),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe({
                next: updatedTopics => {
                    this._isPanelOpen.set(false);
                    this.topicsChanged.emit(updatedTopics);
                    this.notification.success('Словники сохранены');
                    this.logger.info('Topics updated', { articleId, topics: updatedTopics });
                },
                error: (err: unknown) => {
                    this.notification.error('Не удалось сохранить словники');
                    this.logger.error('Failed to update topics', err);
                },
            });
    }
}
