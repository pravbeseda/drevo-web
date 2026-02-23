import { ConfirmationConfig } from './confirmation.types';
import { ButtonComponent } from '../components/button/button.component';
import { MODAL_DATA } from '../modal/models/modal.tokens';
import { ModalData } from '../modal/models/modal.types';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

@Component({
    selector: 'ui-confirmation-dialog',
    imports: [ButtonComponent],
    templateUrl: './confirmation-dialog.component.html',
    styleUrl: './confirmation-dialog.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmationDialogComponent {
    private readonly modalData = inject<ModalData<ConfirmationConfig, string>>(MODAL_DATA);

    readonly config = this.modalData.data;

    select(key: string): void {
        this.modalData.close(key);
    }
}
