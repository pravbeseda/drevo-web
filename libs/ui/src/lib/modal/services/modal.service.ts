import { Injectable, inject } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { Observable } from 'rxjs';

import { ModalContainerComponent } from '../components/modal-container.component';
import {
    LazyComponentLoader,
    ModalConfig,
    ModalRef,
} from '../models/modal.types';

@Injectable({ providedIn: 'root' })
export class ModalService {
    private readonly dialog = inject(MatDialog);

    open<TData = unknown, TResult = unknown>(
        loader: LazyComponentLoader<unknown>,
        config: ModalConfig<TData> = {}
    ): Observable<TResult | undefined> {
        const dialogConfig: MatDialogConfig = {
            data: {
                loader,
                data: config.data,
            },
            width: config.width ?? '500px',
            minWidth: config.minWidth,
            maxWidth: config.maxWidth ?? '90vw',
            maxHeight: '90vh',
            disableClose: config.disableClose ?? false,
            panelClass: this.buildPanelClasses(config.panelClass),
            autoFocus: 'first-tabbable',
            restoreFocus: true,
        };

        const dialogRef = this.dialog.open<
            ModalContainerComponent<TData, TResult>,
            unknown,
            TResult
        >(ModalContainerComponent, dialogConfig);

        return dialogRef.afterClosed();
    }

    openWithRef<TData = unknown, TResult = unknown>(
        loader: LazyComponentLoader<unknown>,
        config: ModalConfig<TData> = {}
    ): { closed: Observable<TResult | undefined>; ref: ModalRef<TResult> } {
        const dialogConfig: MatDialogConfig = {
            data: {
                loader,
                data: config.data,
            },
            width: config.width ?? '500px',
            minWidth: config.minWidth,
            maxWidth: config.maxWidth ?? '90vw',
            maxHeight: '90vh',
            disableClose: config.disableClose ?? false,
            panelClass: this.buildPanelClasses(config.panelClass),
            autoFocus: 'first-tabbable',
            restoreFocus: true,
        };

        const dialogRef = this.dialog.open<
            ModalContainerComponent<TData, TResult>,
            unknown,
            TResult
        >(ModalContainerComponent, dialogConfig);

        return {
            closed: dialogRef.afterClosed(),
            ref: {
                close: (result?: TResult) => dialogRef.close(result),
            },
        };
    }

    private buildPanelClasses(customClass?: string | string[]): string[] {
        const classes = ['ui-modal-panel'];

        if (customClass) {
            if (Array.isArray(customClass)) {
                classes.push(...customClass);
            } else {
                classes.push(customClass);
            }
        }

        return classes;
    }
}
