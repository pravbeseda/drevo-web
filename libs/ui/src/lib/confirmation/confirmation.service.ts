import { ConfirmationConfig } from './confirmation.types';
import { ModalService } from '../modal/services/modal.service';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

const DEFAULT_WIDTH = '450px';

@Injectable({ providedIn: 'root' })
export class ConfirmationService {
    private readonly modalService = inject(ModalService);

    open(config: ConfirmationConfig): Observable<string | undefined> {
        return this.modalService.open<ConfirmationConfig, string>(
            () => import('./confirmation-dialog.component').then(m => m.ConfirmationDialogComponent),
            {
                data: config,
                width: config.width ?? DEFAULT_WIDTH,
                disableClose: config.disableClose ?? false,
                panelClass: 'ui-confirmation-panel',
            },
        );
    }
}
