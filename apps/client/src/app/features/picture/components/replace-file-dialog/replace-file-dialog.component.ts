import { TITLE_MAX_LENGTH, TITLE_MIN_LENGTH } from '../../constants/picture.constants';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent, MODAL_DATA, ModalData } from '@drevo-web/ui';

export interface ReplaceFileDialogData {
    readonly currentTitle: string;
    readonly previewUrl: string;
}

export interface ReplaceFileDialogResult {
    readonly title: string;
}

@Component({
    selector: 'app-replace-file-dialog',
    imports: [ReactiveFormsModule, ButtonComponent],
    templateUrl: './replace-file-dialog.component.html',
    styleUrl: './replace-file-dialog.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReplaceFileDialogComponent {
    private readonly modalData = inject<ModalData<ReplaceFileDialogData, ReplaceFileDialogResult>>(MODAL_DATA);

    readonly previewUrl = this.modalData.data.previewUrl;

    readonly titleControl = new FormControl(this.modalData.data.currentTitle, {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(TITLE_MIN_LENGTH), Validators.maxLength(TITLE_MAX_LENGTH)],
    });

    confirm(): void {
        if (this.titleControl.invalid) return;
        this.modalData.close({ title: this.titleControl.value.trim() });
    }

    cancel(): void {
        this.modalData.close();
    }
}
