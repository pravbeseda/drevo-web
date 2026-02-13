import { ChangeDetectionStrategy, Component, input, output, forwardRef, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';

@Component({
    selector: 'ui-checkbox',
    imports: [MatCheckboxModule],
    templateUrl: './checkbox.component.html',
    styleUrl: './checkbox.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => CheckboxComponent),
            multi: true,
        },
    ],
})
export class CheckboxComponent implements ControlValueAccessor {
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

    protected onCheckboxChange(checked: boolean): void {
        this.checked.set(checked);
        this.onChange(checked);
        this.valueChanged.emit(checked);
    }

    protected onBlur(): void {
        this.onTouched();
    }
}
