import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { LoggerService } from '@drevo-web/core';
import { APPROVAL_CLASS, APPROVAL_TITLES, ApprovalStatus, VersionPairs } from '@drevo-web/shared';
import { ButtonComponent, FormatTimePipe, StatusIconComponent, TextInputComponent } from '@drevo-web/ui';

@Component({
    selector: 'app-article-moderation-panel',
    imports: [ButtonComponent, FormatTimePipe, StatusIconComponent, TextInputComponent],
    templateUrl: './article-moderation-panel.component.html',
    styleUrl: './article-moderation-panel.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleModerationPanelComponent {
    private readonly logger = inject(LoggerService).withContext('ArticleModerationPanelComponent');

    readonly versionPairs = input.required<VersionPairs>();

    readonly statusText = computed(() => {
        const status = this.versionPairs().current.approved;
        return APPROVAL_TITLES[APPROVAL_CLASS[status]];
    });

    private readonly _comment = signal('');
    readonly comment = this._comment.asReadonly();

    readonly isApproved = computed(() => this.versionPairs().current.approved === ApprovalStatus.Approved);
    readonly isRejected = computed(() => this.versionPairs().current.approved === ApprovalStatus.Rejected);

    onCommentChange(value: string): void {
        this._comment.set(value);
    }

    approve(): void {
        this.logger.info('Moderation: approve', {
            versionId: this.versionPairs().current.versionId,
            comment: this._comment(),
        });
    }

    reject(): void {
        this.logger.info('Moderation: reject', {
            versionId: this.versionPairs().current.versionId,
            comment: this._comment(),
        });
    }
}
