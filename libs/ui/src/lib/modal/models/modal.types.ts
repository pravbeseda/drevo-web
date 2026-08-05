import { Type } from '@angular/core';

export type LazyComponentLoader<T> = () => Promise<Type<T>>;

/** @public Named for consumers of the exported `ModalConfig.position`. */
export type ModalPosition = 'center' | 'bottom';

export interface ModalConfig<TData = unknown> {
    data?: TData;
    width?: string;
    minWidth?: string;
    maxWidth?: string;
    height?: string;
    disableClose?: boolean;
    border?: boolean;
    /**
     * Where the modal is anchored. `center` (default) is a centered dialog;
     * `bottom` is a full-width sheet pinned to the bottom of the viewport,
     * growing with its content up to two thirds of the screen height.
     */
    position?: ModalPosition;
}

export interface ModalRef<TResult = unknown> {
    close(result?: TResult): void;
}

export interface ModalData<TData = unknown, TResult = unknown> {
    data: TData;
    close: (result?: TResult) => void;
}
