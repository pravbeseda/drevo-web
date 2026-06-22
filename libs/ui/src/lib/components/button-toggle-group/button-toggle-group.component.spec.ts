import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { createHostFactory, SpectatorHost } from '@ngneat/spectator/jest';
import { ButtonToggleGroupComponent, ButtonToggleOption } from './button-toggle-group.component';

describe('ButtonToggleGroupComponent', () => {
    const options: readonly ButtonToggleOption[] = [
        { value: 0, label: 'Не определился', icon: 'help', tone: 'neutral' },
        { value: 1, label: 'Одобряю', icon: 'check', tone: 'success' },
        { value: 2, label: 'Возражаю', icon: 'close', tone: 'error' },
    ];

    let spectator: SpectatorHost<ButtonToggleGroupComponent>;
    let control: FormControl<number>;

    const createHost = createHostFactory({
        component: ButtonToggleGroupComponent,
        imports: [ReactiveFormsModule, NoopAnimationsModule],
    });

    beforeEach(() => {
        control = new FormControl<number>(0, { nonNullable: true });
        spectator = createHost(
            `<ui-button-toggle-group [formControl]="control" [options]="options" ariaLabel="Test" />`,
            { hostProps: { control, options } },
        );
    });

    it('renders one toggle per option', () => {
        expect(spectator.queryAll('mat-button-toggle')).toHaveLength(options.length);
    });

    it('renders the option label', () => {
        expect(spectator.query('[data-testid="toggle-1"]')).toHaveText('Одобряю');
    });

    it('reflects the control value as the checked toggle', () => {
        control.setValue(2);
        spectator.detectChanges();

        expect(spectator.query('[data-testid="toggle-2"]')).toHaveClass('mat-button-toggle-checked');
    });

    it('updates the control when a toggle is selected', () => {
        spectator.click('[data-testid="toggle-2"] button');

        expect(control.value).toBe(2);
    });

    it('marks the control touched on focusout', () => {
        expect(control.touched).toBe(false);

        spectator.dispatchFakeEvent('mat-button-toggle-group', 'focusout');

        expect(control.touched).toBe(true);
    });

    it('disables every toggle when the control is disabled', () => {
        control.disable();
        spectator.detectChanges();

        const buttons = spectator.queryAll<HTMLButtonElement>('mat-button-toggle button');
        expect(buttons.length).toBe(options.length);
        expect(buttons.every(button => button.disabled)).toBe(true);
    });
});
