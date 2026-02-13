import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { CheckboxComponent } from './checkbox.component';

describe('CheckboxComponent', () => {
    let spectator: Spectator<CheckboxComponent>;
    const createComponent = createComponentFactory({
        component: CheckboxComponent,
        imports: [NoopAnimationsModule],
    });

    beforeEach(() => {
        spectator = createComponent();
    });

    it('should create', () => {
        expect(spectator.component).toBeTruthy();
    });

    it('should display label when provided', () => {
        spectator.setInput('label', 'Remember me');

        const checkbox = spectator.query('mat-checkbox');
        expect(checkbox?.textContent?.trim()).toBe('Remember me');
    });

    it('should emit valueChanged on checkbox change', () => {
        const valueChangedSpy = jest.fn();
        spectator.component.valueChanged.subscribe(valueChangedSpy);

        const checkbox = spectator.query('mat-checkbox input') as HTMLInputElement;
        checkbox.click();
        spectator.detectChanges();

        expect(valueChangedSpy).toHaveBeenCalledWith(true);
    });

    it('should update checked state via writeValue', () => {
        spectator.component.writeValue(true);
        spectator.detectChanges();

        const checkbox = spectator.query('mat-checkbox');
        expect(checkbox?.classList).toContain('mat-mdc-checkbox-checked');
    });

    it('should be disabled when disabled input is true', () => {
        spectator.setInput('disabled', true);

        const checkbox = spectator.query('mat-checkbox');
        expect(checkbox?.classList).toContain('mat-mdc-checkbox-disabled');
    });

    it('should call onTouched when blurred', () => {
        const onTouchedSpy = jest.fn();
        spectator.component.registerOnTouched(onTouchedSpy);

        const checkbox = spectator.query('mat-checkbox') as HTMLElement;
        checkbox.dispatchEvent(new FocusEvent('blur'));
        spectator.detectChanges();

        expect(onTouchedSpy).toHaveBeenCalled();
    });
});
