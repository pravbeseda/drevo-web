import { isOpenToModeration } from '../../helpers/moderation';
import { diffUrl, versionUrl } from '../../helpers/page-kind';
import { ReviewBadgeComponent } from '../review-badge/review-badge.component';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApprovalStatus, ArticleHistoryItem, PageKind, ReviewSummary } from '@drevo-web/shared';
import { ButtonComponent } from '@drevo-web/ui/button';
import { FormatTimePipe } from '@drevo-web/ui/format-time';
import { IconComponent } from '@drevo-web/ui/icon';
import { IconButtonComponent } from '@drevo-web/ui/icon-button';
import { StatusIconComponent } from '@drevo-web/ui/status-icon';
import { TooltipDirective } from '@drevo-web/ui/tooltip';

const CHAR_COUNT_FORMAT = new Intl.NumberFormat('ru-RU');

/** A zero count says nothing to a moderator, so it is left out. */
function formatCharCount(count: number): string | undefined {
    return count > 0 ? CHAR_COUNT_FORMAT.format(count) : undefined;
}

/** A new page has nothing to compare with, so its marker shows the text's length instead of `+N −M`. */
interface EditSizeView {
    readonly length?: string;
    readonly added?: string;
    readonly removed?: string;
    readonly tooltip: string;
}

@Component({
    selector: 'app-articles-history-item',
    imports: [
        StatusIconComponent,
        RouterLink,
        FormatTimePipe,
        IconButtonComponent,
        IconComponent,
        ButtonComponent,
        ReviewBadgeComponent,
        TooltipDirective,
    ],
    templateUrl: './articles-history-item.component.html',
    styleUrl: './articles-history-item.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticlesHistoryItemComponent {
    readonly item = input.required<ArticleHistoryItem>();
    readonly kind = input<PageKind>('articles');
    readonly selected = input(false);
    readonly selectable = input(false);
    readonly canCompare = input(false);
    readonly inwork = input(false);
    readonly reviewSummary = input<ReviewSummary>();
    readonly canModerate = input(false);

    readonly selectItem = output<ArticleHistoryItem>();
    readonly compare = output();
    readonly moderate = output<ArticleHistoryItem>();

    readonly isModeratable = computed(() => this.canModerate() && isOpenToModeration(this.item().approved));

    /**
     * Review pill is only meaningful while a version awaits moderation. Once a
     * version is approved/rejected/cancelled, the verdict is final, so the
     * people's-review pill is hidden even if a summary is still around.
     */
    readonly showReviewBadge = computed(
        () => this.reviewSummary() !== undefined && this.item().approved === ApprovalStatus.Pending,
    );

    /** The size of an edit is a moderator's hint, so it shows only to them and only while the edit awaits them. */
    protected readonly editSize = computed((): EditSizeView | undefined => {
        const { approved, editSize } = this.item();
        if (!this.canModerate() || approved !== ApprovalStatus.Pending || !editSize) return undefined;
        const added = formatCharCount(editSize.added);
        if (editSize.newPage) {
            return added ? { length: added, tooltip: `Символов в тексте новой страницы: ${added}` } : undefined;
        }
        const removed = formatCharCount(editSize.removed);
        if (!added && !removed) return undefined;
        const parts = [added && `добавлено: ${added}`, removed && `удалено: ${removed}`].filter(Boolean);
        return { added, removed, tooltip: `Символов ${parts.join(', ')}` };
    });

    readonly diffLink = computed(() => diffUrl(this.kind(), this.item().versionId));

    readonly versionLink = computed(() => versionUrl(this.kind(), this.item().articleId, this.item().versionId));

    /**
     * Where the review pill navigates: the version's diff, or — for new versions
     * (nothing to compare against) — the version page itself. Mirrors legacy.
     */
    readonly reviewLink = computed(() => (this.item().isNew ? this.versionLink() : this.diffLink()));

    onItemClick(): void {
        if (this.selectable()) {
            this.selectItem.emit(this.item());
        }
    }

    onCompareClick(event: Event): void {
        event.stopPropagation();
        this.compare.emit();
    }

    onModerateClick(event: Event): void {
        event.stopPropagation();
        this.moderate.emit(this.item());
    }
}
