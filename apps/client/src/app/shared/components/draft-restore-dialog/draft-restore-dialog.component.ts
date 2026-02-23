import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { formatDateHeader, formatTime } from '@drevo-web/shared';
import { ButtonComponent, MODAL_DATA, ModalData } from '@drevo-web/ui';

export interface DraftRestoreDialogData {
    readonly title: string;
    readonly time: number; // epoch ms
}

@Component({
    selector: 'app-draft-restore-dialog',
    imports: [ButtonComponent],
    templateUrl: './draft-restore-dialog.component.html',
    styleUrl: './draft-restore-dialog.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DraftRestoreDialogComponent {
    private readonly modalData = inject<ModalData<DraftRestoreDialogData, boolean>>(MODAL_DATA);

    readonly data = this.modalData.data;
    readonly savedAt = this.formatSavedAt(this.data.time);

    restore(): void {
        this.modalData.close(true);
    }

    decline(): void {
        this.modalData.close(false);
    }

    private formatSavedAt(epochMs: number): string {
        const date = new Date(epochMs);
        const dateStr = formatDateHeader(date);
        const timeStr = formatTime(date);
        return `${dateStr}, ${timeStr}`;
    }
}
