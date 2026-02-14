import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'ui-icon-button',
    imports: [MatIconButton, MatIcon, MatTooltip, RouterLink],
    templateUrl: './icon-button.component.html',
    styleUrl: './icon-button.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconButtonComponent {
    readonly icon = input.required<string>();
    readonly label = input('');
    readonly disabled = input(false);
    readonly link = input<string | readonly unknown[]>();

    readonly clicked = output<void>();

    onClick(): void {
        this.clicked.emit();
    }
}
