import { IconComponent } from '../icon/icon.component';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { APPROVAL_CLASS, APPROVAL_ICONS, APPROVAL_TITLES, ApprovalStatus } from '@drevo-web/shared';

@Component({
    selector: 'ui-status-icon',
    imports: [IconComponent],
    templateUrl: './status-icon.component.html',
    styleUrl: './status-icon.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '[class]': 'approvalClass()',
    },
})
export class StatusIconComponent {
    readonly status = input.required<ApprovalStatus>();

    readonly approvalClass = computed(() => APPROVAL_CLASS[this.status()]);
    readonly icon = computed(() => APPROVAL_ICONS[this.approvalClass()]);
    readonly tooltip = computed(() => APPROVAL_TITLES[this.approvalClass()]);
}
