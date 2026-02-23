import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ButtonComponent, MODAL_DATA, ModalData } from '@drevo-web/ui';

@Component({
    selector: 'app-draft-discard-dialog',
    imports: [ButtonComponent],
    templateUrl: './draft-discard-dialog.component.html',
    styleUrl: './draft-discard-dialog.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DraftDiscardDialogComponent {
    private readonly modalData = inject<ModalData<undefined, boolean>>(MODAL_DATA);

    confirm(): void {
        this.modalData.close(true);
    }

    cancel(): void {
        this.modalData.close(false);
    }
}
