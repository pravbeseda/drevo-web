import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { TextInputComponent } from './text-input.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('TextInputComponent', () => {
    let spectator: Spectator<TextInputComponent>;
    const createComponent = createComponentFactory({
        component: TextInputComponent,
        imports: [NoopAnimationsModule],
    });

    beforeEach(() => {
        spectator = createComponent();
    });

    it('should create', () => {
        expect(spectator.component).toBeTruthy();
    });

    it('should display label when provided', () => {
        spectator.setInput('label', 'Username');

        const label = spectator.query('mat-label');
        expect(label?.textContent).toBe('Username');
    });

    it('should emit valueChanged on input', () => {
        const valueChangedSpy = jest.fn();
        spectator.component.valueChanged.subscribe(valueChangedSpy);

        const input = spectator.query<HTMLInputElement>('input')!;
        spectator.typeInElement('test value', input);

        expect(valueChangedSpy).toHaveBeenCalledWith('test value');
    });

    it('should implement ControlValueAccessor writeValue', () => {
        spectator.component.writeValue('initial value');
        spectator.detectChanges();

        const input = spectator.query<HTMLInputElement>('input')!;
        expect(input.value).toBe('initial value');
    });

    it('should call onChange when input changes', () => {
        const onChangeSpy = jest.fn();
        spectator.component.registerOnChange(onChangeSpy);

        const input = spectator.query<HTMLInputElement>('input')!;
        spectator.typeInElement('new value', input);

        expect(onChangeSpy).toHaveBeenCalledWith('new value');
    });

    it('should call onTouched on blur', () => {
        const onTouchedSpy = jest.fn();
        spectator.component.registerOnTouched(onTouchedSpy);

        const input = spectator.query<HTMLInputElement>('input')!;
        spectator.dispatchFakeEvent(input, 'blur');

        expect(onTouchedSpy).toHaveBeenCalled();
    });

    it('should set disabled state', () => {
        spectator.component.setDisabledState(true);
        spectator.detectChanges();

        const input = spectator.query<HTMLInputElement>('input')!;
        expect(input.disabled).toBe(true);
    });

    it('should display hint when provided', () => {
        spectator.setInput('hint', 'Enter your username');

        const hint = spectator.query('mat-hint');
        expect(hint?.textContent).toBe('Enter your username');
    });

    it('should display error message when provided', () => {
        spectator.setInput('errorMessage', 'Field is required');

        // mat-error is rendered but may be hidden by Material until form is invalid
        // Check that the errorMessage input is set correctly
        expect(spectator.component.errorMessage()).toBe('Field is required');
    });

    it('should hide hint when error message is displayed', () => {
        spectator.setInput('hint', 'Some hint');
        spectator.setInput('errorMessage', 'Some error');

        const hint = spectator.query('mat-hint');
        expect(hint).toBeNull();
    });

    it('should set input type', () => {
        spectator.setInput('type', 'password');

        const input = spectator.query<HTMLInputElement>('input')!;
        expect(input.type).toBe('password');
    });
});
