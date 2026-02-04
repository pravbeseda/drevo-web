import { NgClass } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
    APPROVAL_CLASS,
    type ApprovalClass,
    ArticleHistoryItem,
} from '@drevo-web/shared';
import { FormatTimePipe, IconComponent } from '@drevo-web/ui';

const STATUS_ICONS: Record<ApprovalClass, string> = {
    approved: 'check_circle',
    pending: 'schedule',
    rejected: 'cancel',
};

const STATUS_TITLES: Record<ApprovalClass, string> = {
    approved: 'Одобрено',
    pending: 'На проверке',
    rejected: 'Отклонено',
};

@Component({
    selector: 'app-articles-history-item',
    imports: [IconComponent, RouterLink, FormatTimePipe, NgClass],
    templateUrl: './articles-history-item.component.html',
    styleUrl: './articles-history-item.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticlesHistoryItemComponent {
    readonly item = input.required<ArticleHistoryItem>();

    readonly approvalClass = computed(
        () => APPROVAL_CLASS[this.item().approved]
    );
    readonly statusIcon = computed(() => STATUS_ICONS[this.approvalClass()]);
    readonly statusTitle = computed(() => STATUS_TITLES[this.approvalClass()]);
}
