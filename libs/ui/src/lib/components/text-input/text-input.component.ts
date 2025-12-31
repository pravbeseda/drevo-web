import {
    ChangeDetectionStrategy,
    Component,
    input,
    output,
    forwardRef,
    signal,
} from '@angular/core';
import {
    ControlValueAccessor,
    NG_VALUE_ACCESSOR,
    ReactiveFormsModule,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
    selector: 'ui-text-input',
    imports: [MatFormFieldModule, MatInputModule, ReactiveFormsModule],
    templateUrl: './text-input.component.html',
    styleUrl: './text-input.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => TextInputComponent),
            multi: true,
        },
    ],
})
export class TextInputComponent implements ControlValueAccessor {
    label = input<string>('');
    placeholder = input<string>('');
    hint = input<string>('');
    errorMessage = input<string>('');
    type = input<'text' | 'email' | 'password' | 'number' | 'tel' | 'url'>(
        'text'
    );
    disabled = input<boolean>(false);
    readonly = input<boolean>(false);
    required = input<boolean>(false);
    maxLength = input<number | null>(null);
    minLength = input<number | null>(null);

    valueChanged = output<string>();

    protected value = signal<string>('');
    protected isDisabled = signal<boolean>(false);

    private onChange: (value: string) => void = () => {};
    private onTouched: () => void = () => {};

    writeValue(value: string): void {
        this.value.set(value ?? '');
    }

    registerOnChange(fn: (value: string) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.isDisabled.set(isDisabled);
    }

    protected onInput(event: Event): void {
        const input = event.target as HTMLInputElement;
        const newValue = input.value;
        this.value.set(newValue);
        this.onChange(newValue);
        this.valueChanged.emit(newValue);
    }

    protected onBlur(): void {
        this.onTouched();
    }
}
