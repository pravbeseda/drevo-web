import { Type } from '@angular/core';

export type LazyComponentLoader<T> = () => Promise<Type<T>>;

export interface ModalConfig<TData = unknown> {
    data?: TData;
    width?: string;
    minWidth?: string;
    maxWidth?: string;
    minHeight?: string;
    maxHeight?: string;
    disableClose?: boolean;
    fullscreen?: boolean;
}

export interface ModalRef<TResult = unknown> {
    close(result?: TResult): void;
}

export interface ModalData<TData = unknown, TResult = unknown> {
    data: TData;
    close: (result?: TResult) => void;
}
