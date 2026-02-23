export type ConfirmationButtonVariant = 'primary' | 'secondary' | 'text';

export interface ConfirmationButton {
    readonly key: string;
    readonly label: string;
    readonly variant?: ConfirmationButtonVariant;
}

export interface ConfirmationConfig {
    readonly title: string;
    readonly message: string;
    readonly buttons: readonly ConfirmationButton[];
    readonly disableClose?: boolean;
    readonly width?: string;
}
