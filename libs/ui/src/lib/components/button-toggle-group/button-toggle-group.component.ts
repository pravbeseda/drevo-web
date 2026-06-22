import { IconComponent, IconTone } from '../icon/icon.component';
import { ChangeDetectionStrategy, Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

export interface ButtonToggleOption {
    readonly value: string | number;
    readonly label: string;
    readonly icon?: string;
    readonly tone?: IconTone;
    readonly iconFilled?: boolean;
}

@Component({
    selector: 'ui-button-toggle-group',
    imports: [MatButtonToggleModule, IconComponent],
    templateUrl: './button-toggle-group.component.html',
    styleUrl: './button-toggle-group.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => ButtonToggleGroupComponent),
            multi: true,
        },
    ],
})
export class ButtonToggleGroupComponent implements ControlValueAccessor {
    readonly options = input.required<readonly ButtonToggleOption[]>();
    readonly ariaLabel = input<string>();

    protected readonly value = signal<string | number | undefined>(undefined);
    protected readonly isDisabled = signal(false);

    private onChange: (value: string | number) => void = () => {
        /* empty */
    };
    private onTouched: () => void = () => {
        /* empty */
    };

    writeValue(value: string | number | undefined): void {
        this.value.set(value);
    }

    registerOnChange(fn: (value: string | number) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.isDisabled.set(isDisabled);
    }

    protected onSelectionChange(value: string | number): void {
        this.value.set(value);
        this.onChange(value);
    }

    protected onBlur(): void {
        this.onTouched();
    }
}
