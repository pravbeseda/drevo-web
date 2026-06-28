import { IconComponent, IconTone } from '../icon/icon.component';
import { ChangeDetectionStrategy, Component, forwardRef, input, output, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

export interface ButtonToggleOption {
    readonly value: string | number;
    readonly label: string;
    readonly icon?: string;
    readonly tone?: IconTone;
    readonly iconFilled?: boolean;
}

/** Emitted on every user click on an option, including re-clicks of the active one. */
export interface ButtonToggleClick {
    readonly value: string | number;
    /** True when the click moved the selection; false when re-clicking the active option. */
    readonly changed: boolean;
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

    readonly optionClick = output<ButtonToggleClick>();

    protected readonly value = signal<string | number | undefined>(undefined);
    protected readonly isDisabled = signal(false);

    /**
     * Set by the group's `change` (fired synchronously before the click bubbles
     * to the toggle host), so `onToggleClick` can tell a real change from a
     * re-click of the already-selected option.
     */
    private changedDuringClick = false;

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
        this.changedDuringClick = true;
    }

    protected onToggleClick(value: string | number): void {
        const changed = this.changedDuringClick;
        this.changedDuringClick = false;
        this.optionClick.emit({ value, changed });
    }

    protected onBlur(): void {
        this.onTouched();
    }
}
