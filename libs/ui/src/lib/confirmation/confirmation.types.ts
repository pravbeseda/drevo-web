import { ButtonAccent, ButtonVariant } from '../components/button/button.component';

export interface ConfirmationButton {
    readonly key: string;
    readonly label: string;
    readonly variant?: ButtonVariant;
    readonly accent?: ButtonAccent;
}

export interface ConfirmationConfig {
    readonly title: string;
    readonly message: string;
    readonly buttons: readonly ConfirmationButton[];
    readonly disableClose?: boolean;
    readonly width?: string;
}
