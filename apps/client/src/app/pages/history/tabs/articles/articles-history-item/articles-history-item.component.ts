import { NgClass } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
    output,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
    APPROVAL_CLASS,
    APPROVAL_ICONS,
    APPROVAL_TITLES,
    ArticleHistoryItem,
} from '@drevo-web/shared';
import {
    FormatTimePipe,
    IconButtonComponent,
    IconComponent,
} from '@drevo-web/ui';

@Component({
    selector: 'app-articles-history-item',
    imports: [
        IconComponent,
        RouterLink,
        FormatTimePipe,
        NgClass,
        IconButtonComponent,
    ],
    templateUrl: './articles-history-item.component.html',
    styleUrl: './articles-history-item.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticlesHistoryItemComponent {
    readonly item = input.required<ArticleHistoryItem>();
    readonly viewDiff = output<number>();

    readonly approvalClass = computed(
        () => APPROVAL_CLASS[this.item().approved]
    );
    readonly statusIcon = computed(() => APPROVAL_ICONS[this.approvalClass()]);
    readonly statusTitle = computed(
        () => APPROVAL_TITLES[this.approvalClass()]
    );

    onViewDiff(): void {
        this.viewDiff.emit(this.item().versionId);
    }
}
