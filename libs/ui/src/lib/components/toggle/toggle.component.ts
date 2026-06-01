import { ChangeDetectionStrategy, Component, forwardRef, input, output, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

@Component({
    selector: 'ui-toggle',
    imports: [MatSlideToggleModule],
    templateUrl: './toggle.component.html',
    styleUrl: './toggle.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => ToggleComponent),
            multi: true,
        },
    ],
})
export class ToggleComponent implements ControlValueAccessor {
    label = input<string>('');
    disabled = input<boolean>(false);

    valueChanged = output<boolean>();

    protected checked = signal<boolean>(false);
    protected isDisabled = signal<boolean>(false);

    private onChange: (value: boolean) => void = () => {
        /* empty */
    };
    private onTouched: () => void = () => {
        /* empty */
    };

    writeValue(value: boolean): void {
        this.checked.set(value ?? false);
    }

    registerOnChange(fn: (value: boolean) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.isDisabled.set(isDisabled);
    }

    protected onToggleChange(checked: boolean): void {
        this.checked.set(checked);
        this.onChange(checked);
        this.valueChanged.emit(checked);
    }

    protected onBlur(): void {
        this.onTouched();
    }
}
