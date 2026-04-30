import { ModalContainerComponent } from '../components/modal-container.component';
import { LazyComponentLoader, ModalConfig, ModalRef } from '../models/modal.types';
import { Injectable, inject } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ModalService {
    private readonly dialog = inject(MatDialog);

    open<TData = unknown, TResult = unknown>(
        loader: LazyComponentLoader<unknown>,
        config: ModalConfig<TData> = {}
    ): Observable<TResult | undefined> {
        const dialogRef = this.dialog.open<ModalContainerComponent<TData, TResult>, unknown, TResult>(
            ModalContainerComponent,
            this.buildDialogConfig(loader, config)
        );

        return dialogRef.afterClosed();
    }

    openWithRef<TData = unknown, TResult = unknown>(
        loader: LazyComponentLoader<unknown>,
        config: ModalConfig<TData> = {}
    ): { closed: Observable<TResult | undefined>; ref: ModalRef<TResult> } {
        const dialogRef = this.dialog.open<ModalContainerComponent<TData, TResult>, unknown, TResult>(
            ModalContainerComponent,
            this.buildDialogConfig(loader, config)
        );

        return {
            closed: dialogRef.afterClosed(),
            ref: {
                close: (result?: TResult) => dialogRef.close(result),
            },
        };
    }

    private buildDialogConfig<TData>(
        loader: LazyComponentLoader<unknown>,
        config: ModalConfig<TData>
    ): MatDialogConfig {
        const isFullscreen = config.fullscreen ?? false;

        return {
            data: {
                loader,
                data: config.data,
            },
            width: isFullscreen ? '90vw' : (config.width ?? '500px'),
            minWidth: config.minWidth,
            maxWidth: isFullscreen ? '90vw' : (config.maxWidth ?? '90vw'),
            minHeight: isFullscreen ? '90vh' : config.minHeight,
            maxHeight: '90vh',
            disableClose: config.disableClose ?? false,
            panelClass: isFullscreen ? ['ui-modal-panel', 'ui-modal-fullscreen'] : ['ui-modal-panel'],
            autoFocus: 'first-tabbable',
            restoreFocus: true,
        };
    }
}
