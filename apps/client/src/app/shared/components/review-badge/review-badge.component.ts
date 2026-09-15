import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
    REVIEW_STATUS_CLASS,
    REVIEW_STATUS_ICONS,
    REVIEW_STATUS_LABELS,
    REVIEW_TALLY_STATUSES,
    ReviewStatus,
    ReviewStatusClass,
    ReviewSummary,
} from '@drevo-web/shared';
import { IconComponent, TooltipDirective } from '@drevo-web/ui';

interface ReviewChip {
    readonly status: ReviewStatus;
    readonly statusClass: ReviewStatusClass;
    readonly icon: string;
    readonly text: string;
    readonly tooltip: string;
}

function chipText(count: number, holdsMyVote: boolean): string {
    if (!holdsMyVote) {
        return String(count);
    }
    const others = count - 1;
    return others > 0 ? `вы +${others}` : 'вы';
}

/**
 * People's review badge for a history row: one chip per verdict with votes, the
 * viewer's own chip reading "вы" / "вы +N", then the "Нужен ваш голос" pill.
 * Each chip's tooltip names its verdict and that verdict's voters.
 */
@Component({
    selector: 'app-review-badge',
    imports: [IconComponent, TooltipDirective],
    templateUrl: './review-badge.component.html',
    styleUrl: './review-badge.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewBadgeComponent {
    readonly summary = input.required<ReviewSummary>();

    readonly needsMyVote = computed<boolean>(() => this.summary().needsMyVote);

    readonly chips = computed<readonly ReviewChip[]>(() => {
        const { voters, myVote } = this.summary();
        return REVIEW_TALLY_STATUSES.flatMap(status => {
            const names = voters[status] ?? [];
            if (names.length === 0) {
                return [];
            }
            return [
                {
                    status,
                    statusClass: REVIEW_STATUS_CLASS[status],
                    icon: REVIEW_STATUS_ICONS[status],
                    text: chipText(names.length, status === myVote),
                    tooltip: `${REVIEW_STATUS_LABELS[status]}: ${names.join(', ')}`,
                },
            ];
        });
    });
}
