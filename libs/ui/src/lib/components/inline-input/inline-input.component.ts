import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * A single-line field with no frame or floating label: the placeholder names
 * it, and the surrounding layout supplies the dividers.
 */
@Component({
    selector: 'ui-inline-input',
    templateUrl: './inline-input.component.html',
    styleUrl: './inline-input.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InlineInputComponent {
    readonly value = input<string>('');
    readonly placeholder = input<string>('');
    readonly ariaLabel = input<string>();

    readonly valueChanged = output<string>();

    protected onInput(event: Event): void {
        this.valueChanged.emit((event.target as HTMLInputElement).value);
    }
}
