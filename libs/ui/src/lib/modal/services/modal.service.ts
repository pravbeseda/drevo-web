import { ModalContainerComponent } from '../components/modal-container.component';
import { LazyComponentLoader, ModalConfig, ModalRef } from '../models/modal.types';
import { Injectable, inject } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { Observable } from 'rxjs';

const CENTER_MAX_HEIGHT = '90vh';
const CENTER_DEFAULT_WIDTH = '500px';
const CENTER_MAX_WIDTH = '90vw';
const BOTTOM_SHEET_MAX_HEIGHT = '66.67vh';
const BOTTOM_SHEET_WIDTH = '100vw';
// Enter is driven by CSS keyframes (see `_modal.scss`); this only needs to keep
// the dialog element alive long enough. Exit is the dialog's own transform
// transition — the default 75ms reads as an abrupt snap, so slow it down.
const BOTTOM_SHEET_ENTER_DURATION = '280ms';
const BOTTOM_SHEET_EXIT_DURATION = '220ms';

@Injectable({ providedIn: 'root' })
export class ModalService {
    private readonly dialog = inject(MatDialog);

    open<TData = unknown, TResult = unknown>(
        loader: LazyComponentLoader<unknown>,
        config: ModalConfig<TData> = {},
    ): Observable<TResult | undefined> {
        const dialogRef = this.dialog.open<ModalContainerComponent<TData, TResult>, unknown, TResult>(
            ModalContainerComponent,
            this.buildDialogConfig(loader, config),
        );

        return dialogRef.afterClosed();
    }

    openWithRef<TData = unknown, TResult = unknown>(
        loader: LazyComponentLoader<unknown>,
        config: ModalConfig<TData> = {},
    ): { closed: Observable<TResult | undefined>; ref: ModalRef<TResult> } {
        const dialogRef = this.dialog.open<ModalContainerComponent<TData, TResult>, unknown, TResult>(
            ModalContainerComponent,
            this.buildDialogConfig(loader, config),
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
        config: ModalConfig<TData>,
    ): MatDialogConfig {
        const isBottom = config.position === 'bottom';

        const panelClass = ['ui-modal-panel'];
        if (!(config.border ?? true)) {
            panelClass.push('ui-modal-no-border');
        }
        if (isBottom) {
            panelClass.push('ui-modal-bottom-sheet');
        }

        return {
            data: {
                loader,
                data: config.data,
            },
            width: config.width ?? (isBottom ? BOTTOM_SHEET_WIDTH : CENTER_DEFAULT_WIDTH),
            minWidth: config.minWidth,
            maxWidth: config.maxWidth ?? (isBottom ? BOTTOM_SHEET_WIDTH : CENTER_MAX_WIDTH),
            height: config.height,
            maxHeight: isBottom ? BOTTOM_SHEET_MAX_HEIGHT : CENTER_MAX_HEIGHT,
            position: isBottom ? { bottom: '0' } : undefined,
            enterAnimationDuration: isBottom ? BOTTOM_SHEET_ENTER_DURATION : undefined,
            exitAnimationDuration: isBottom ? BOTTOM_SHEET_EXIT_DURATION : undefined,
            disableClose: config.disableClose ?? false,
            panelClass,
            backdropClass: ['cdk-overlay-dark-backdrop', 'ui-modal-backdrop'],
            autoFocus: 'first-tabbable',
            restoreFocus: true,
        };
    }
}
