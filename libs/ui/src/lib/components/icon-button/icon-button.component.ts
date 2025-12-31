import {
    ChangeDetectionStrategy,
    Component,
    input,
    output,
} from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

@Component({
    selector: 'ui-icon-button',
    imports: [MatIconButton, MatIcon],
    templateUrl: './icon-button.component.html',
    styleUrl: './icon-button.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconButtonComponent {
    icon = input.required<string>();
    label = input<string>('');
    disabled = input<boolean>(false);

    clicked = output<void>();

    onClick(): void {
        this.clicked.emit();
    }
}
