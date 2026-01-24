import {
    ChangeDetectionStrategy,
    Component,
    input,
    output,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'text';
export type ButtonType = 'button' | 'submit' | 'reset';

@Component({
    selector: 'ui-button',
    imports: [
        NgTemplateOutlet,
        RouterLink,
        MatButtonModule,
        MatProgressSpinnerModule,
    ],
    templateUrl: './button.component.html',
    styleUrl: './button.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ButtonComponent {
    variant = input<ButtonVariant>('primary');
    type = input<ButtonType>('button');
    disabled = input<boolean>(false);
    loading = input<boolean>(false);
    fullWidth = input<boolean>(false);
    href = input<string | undefined>(undefined);

    clicked = output<MouseEvent>();

    protected onClick(event: MouseEvent): void {
        if (this.disabled() || this.loading()) {
            event.preventDefault();
            return;
        }
        this.clicked.emit(event);
    }
}
