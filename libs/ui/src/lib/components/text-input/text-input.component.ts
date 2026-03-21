import { ChangeDetectionStrategy, Component, computed, effect, input, output, forwardRef, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldAppearance, MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

type TextInputAppearance = 'outline' | 'fill' | 'underline';

@Component({
    selector: 'ui-text-input',
    imports: [MatFormFieldModule, MatIcon, MatInputModule, ReactiveFormsModule],
    templateUrl: './text-input.component.html',
    styleUrl: './text-input.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '[class.appearance-underline]': 'appearance() === "underline"',
    },
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => TextInputComponent),
            multi: true,
        },
    ],
})
export class TextInputComponent implements ControlValueAccessor {
    appearance = input<TextInputAppearance>('outline');
    icon = input<string>();
    label = input<string>('');
    placeholder = input<string>('');
    hint = input<string>('');
    errorMessage = input<string>('');
    type = input<'text' | 'email' | 'password' | 'number' | 'tel' | 'url'>('text');
    autocomplete = input<string>('off');
    disabled = input<boolean>(false);
    readonly = input<boolean>(false);
    required = input<boolean>(false);
    maxLength = input<number | undefined>(undefined);
    minLength = input<number | undefined>(undefined);
    multiline = input<boolean>(false);
    rows = input<number>(3);
    value = input<string>('');

    valueChanged = output<string>();

    protected matAppearance = computed<MatFormFieldAppearance>(() =>
        this.appearance() === 'outline' ? 'outline' : 'fill'
    );
    protected displayValue = signal<string>('');

    private isChangesHandled = false;

    constructor() {
        effect(() => {
            if (!this.isChangesHandled) {
                this.displayValue.set(this.value());
            }
        });
    }
    protected isDisabled = signal<boolean>(false);

    private onChange: (value: string) => void = () => {
        /* empty */
    };
    private onTouched: () => void = () => {
        /* empty */
    };

    writeValue(value: string): void {
        this.displayValue.set(value ?? '');
    }

    registerOnChange(fn: (value: string) => void): void {
        this.isChangesHandled = true;
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.isDisabled.set(isDisabled);
    }

    protected onInput(event: Event): void {
        const input = event.target as HTMLInputElement | HTMLTextAreaElement;
        const newValue = input.value;
        this.displayValue.set(newValue);
        this.onChange(newValue);
        this.valueChanged.emit(newValue);
    }

    protected onBlur(): void {
        this.onTouched();
    }
}
