import { ArticleHistoryService, trackByFn } from '../../../services/articles/article-history/article-history.service';
import { AuthService } from '../../../services/auth/auth.service';
import { ArticlesHistoryItemComponent } from '../articles-history-item/articles-history-item.component';
import { InworkItemComponent } from '../inwork-item/inwork-item.component';
import { openModerationSheet } from '../moderation-sheet/open-moderation-sheet';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, output } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { LoggerService } from '@drevo-web/core';
import { ArticleHistoryItem, ModerationResult } from '@drevo-web/shared';
import { ModalService } from '@drevo-web/ui/modal';
import { SpinnerComponent } from '@drevo-web/ui/spinner';
import { VirtualScrollerComponent, VirtualScrollerItemDirective } from '@drevo-web/ui/virtual-scroller';

@Component({
    selector: 'app-article-history-list',
    imports: [
        ArticlesHistoryItemComponent,
        InworkItemComponent,
        SpinnerComponent,
        VirtualScrollerComponent,
        VirtualScrollerItemDirective,
    ],
    templateUrl: './article-history-list.component.html',
    styleUrl: './article-history-list.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleHistoryListComponent {
    readonly selectedVersionIds = input<ReadonlySet<number>>(new Set());
    readonly selectable = input(false);
    readonly canCompare = input(false);

    readonly selectItem = output<ArticleHistoryItem>();
    readonly compareItems = output();
    readonly moderated = output<ModerationResult>();

    protected readonly service = inject(ArticleHistoryService);
    protected readonly trackByFn = trackByFn;

    private readonly modalService = inject(ModalService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly logger = inject(LoggerService).withContext('ArticleHistoryListComponent');
    private readonly user = toSignal(inject(AuthService).user$);

    readonly canModerate = computed(() => this.user()?.permissions.canModerate ?? false);

    onCancelInwork(title: string): void {
        this.service.onCancelInwork(title);
    }

    onModerate(item: ArticleHistoryItem): void {
        this.logger.info('Moderation sheet opened from history', { versionId: item.versionId });
        openModerationSheet(this.modalService, item)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(result => {
                if (!result) return;
                this.service.applyModeration(result);
                this.moderated.emit(result);
                this.logger.info('Version moderated from history', {
                    versionId: result.versionId,
                    approved: result.approved,
                });
            });
    }
}
