import { ArticleService } from '../../../services/articles';
import { AuthService } from '../../../services/auth/auth.service';
import { SidebarActionComponent } from '../sidebar-action/sidebar-action.component';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { LoggerService } from '@drevo-web/core';
import { getTopicIconPath, getTopicsByIds, TOPICS } from '@drevo-web/shared';
import { ButtonComponent, CheckboxComponent, SidePanelComponent } from '@drevo-web/ui';

@Component({
    selector: 'app-topics-sidebar-action',
    imports: [FormsModule, SidebarActionComponent, SidePanelComponent, CheckboxComponent, ButtonComponent],
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

    private readonly user = toSignal(this.authService.user$);
    readonly canModerate = computed(() => this.user()?.permissions.canModerate ?? false);

    readonly firstTopicIcon = computed(() => {
        const topicIds = this.topics();
        if (topicIds.length === 0) {
            return undefined;
        }
        const matched = getTopicsByIds(topicIds);
        return matched.length > 0 ? getTopicIconPath(matched[0].icon) : undefined;
    });

    readonly topicCount = computed(() => this.topics().length);

    private readonly _isPanelOpen = signal(false);
    readonly isPanelOpen = this._isPanelOpen.asReadonly();

    private readonly _isSaving = signal(false);
    readonly isSaving = this._isSaving.asReadonly();

    readonly selectedTopics = signal<ReadonlyArray<number>>([]);

    protected readonly allTopics = TOPICS;

    togglePanel(): void {
        const isOpen = this._isPanelOpen();
        if (!isOpen) {
            this.selectedTopics.set([...this.topics()]);
        }
        this._isPanelOpen.set(!isOpen);
    }

    closePanel(): void {
        this._isPanelOpen.set(false);
    }

    onTopicToggle(topicId: number, checked: boolean): void {
        this.selectedTopics.update(current => {
            if (checked) {
                return current.includes(topicId) ? current : [...current, topicId];
            }
            return current.filter(id => id !== topicId);
        });
    }

    isTopicSelected(topicId: number): boolean {
        return this.selectedTopics().includes(topicId);
    }

    save(): void {
        this._isSaving.set(true);
        const articleId = this.articleId();
        const topics = this.selectedTopics();

        this.articleService
            .updateTopics(articleId, topics)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: updatedTopics => {
                    this._isSaving.set(false);
                    this._isPanelOpen.set(false);
                    this.topicsChanged.emit(updatedTopics);
                    this.logger.info('Topics updated', { articleId, topics: updatedTopics });
                },
                error: () => {
                    this._isSaving.set(false);
                    this.logger.error('Failed to update topics', { articleId });
                },
            });
    }

    protected getTopicIconPath(icon: string): string {
        return getTopicIconPath(icon);
    }
}
