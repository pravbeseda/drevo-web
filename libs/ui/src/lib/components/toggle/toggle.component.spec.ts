import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { ToggleComponent } from './toggle.component';

describe('ToggleComponent', () => {
    let spectator: Spectator<ToggleComponent>;
    const createComponent = createComponentFactory({
        component: ToggleComponent,
        imports: [NoopAnimationsModule],
    });

    beforeEach(() => {
        spectator = createComponent();
    });

    it('should create', () => {
        expect(spectator.component).toBeTruthy();
    });

    it('should display label when provided', () => {
        spectator.setInput('label', 'Hide cancelled');

        const toggle = spectator.query('mat-slide-toggle');
        expect(toggle?.textContent?.trim()).toBe('Hide cancelled');
    });

    it('should emit valueChanged on toggle change', () => {
        const valueChangedSpy = jest.fn();
        spectator.component.valueChanged.subscribe(valueChangedSpy);

        const button = spectator.query('mat-slide-toggle button') as HTMLButtonElement;
        button.click();
        spectator.detectChanges();

        expect(valueChangedSpy).toHaveBeenCalledWith(true);
    });

    it('should update checked state via writeValue', () => {
        spectator.component.writeValue(true);
        spectator.detectChanges();

        const toggle = spectator.query('mat-slide-toggle');
        expect(toggle?.classList).toContain('mat-mdc-slide-toggle-checked');
    });

    it('should be disabled when disabled input is true', () => {
        spectator.setInput('disabled', true);

        const button = spectator.query('mat-slide-toggle button') as HTMLButtonElement;
        expect(button.disabled).toBe(true);
    });

    it('should call onTouched when blurred', () => {
        const onTouchedSpy = jest.fn();
        spectator.component.registerOnTouched(onTouchedSpy);

        const toggle = spectator.query('mat-slide-toggle') as HTMLElement;
        toggle.dispatchEvent(new FocusEvent('blur'));
        spectator.detectChanges();

        expect(onTouchedSpy).toHaveBeenCalled();
    });
});
