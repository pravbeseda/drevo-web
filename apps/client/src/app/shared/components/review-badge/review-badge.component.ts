import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ReviewStatus, ReviewSummary } from '@drevo-web/shared';
import { IconComponent } from '@drevo-web/ui';

type ReviewBadgeClass = 'approve' | 'suggest' | 'disagree';

/**
 * Verdict → pill css modifier (priority is already resolved on the server via
 * `status`). Undecided has no pill, so it is intentionally absent here.
 */
const REVIEW_STATUS_CLASS: Record<Exclude<ReviewStatus, typeof ReviewStatus.Undecided>, ReviewBadgeClass> = {
    [ReviewStatus.Approve]: 'approve',
    [ReviewStatus.Suggest]: 'suggest',
    [ReviewStatus.Disagree]: 'disagree',
};

/**
 * Verdict → pill label. Mirrors the legacy AGGREGATE_META labels.
 */
const REVIEW_STATUS_LABEL: Record<Exclude<ReviewStatus, typeof ReviewStatus.Undecided>, string> = {
    [ReviewStatus.Approve]: 'Одобрено',
    [ReviewStatus.Suggest]: 'Нужны правки',
    [ReviewStatus.Disagree]: 'Возражения',
};

/**
 * People's review indicator pill for a history row.
 *
 * `needsMyVote` → blue "Нужен ваш голос" pill (highest priority); otherwise a
 * colored verdict pill (Одобрено / Нужны правки / Возражения) with a neutral
 * total-votes counter. Renders nothing when there is neither.
 */
@Component({
    selector: 'app-review-badge',
    imports: [IconComponent],
    templateUrl: './review-badge.component.html',
    styleUrl: './review-badge.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewBadgeComponent {
    readonly summary = input.required<ReviewSummary>();

    readonly needsMyVote = computed(() => this.summary().needsMyVote);

    private readonly status = computed(() => this.summary().status);

    private readonly verdict = computed<Exclude<ReviewStatus, typeof ReviewStatus.Undecided> | undefined>(() => {
        const status = this.status();
        return status === undefined || status === ReviewStatus.Undecided ? undefined : status;
    });

    readonly badgeClass = computed<ReviewBadgeClass | undefined>(() => {
        const verdict = this.verdict();
        return verdict === undefined ? undefined : REVIEW_STATUS_CLASS[verdict];
    });

    readonly label = computed(() => {
        const verdict = this.verdict();
        return verdict === undefined ? undefined : REVIEW_STATUS_LABEL[verdict];
    });

    readonly total = computed(() => this.summary().total);
}
