import { WikiContentComponent } from '../wiki-content/wiki-content.component';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IconButtonComponent, MODAL_DATA, ModalData } from '@drevo-web/ui';

export interface FootnoteModalData {
    readonly label: string;
    readonly html: string;
}

@Component({
    selector: 'app-footnote-modal',
    imports: [WikiContentComponent, IconButtonComponent],
    templateUrl: './footnote-modal.component.html',
    styleUrl: './footnote-modal.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FootnoteModalComponent {
    private readonly modalData = inject<ModalData<FootnoteModalData>>(MODAL_DATA);

    readonly label = this.modalData.data.label;
    readonly html = this.modalData.data.html;

    close(): void {
        this.modalData.close();
    }
}
