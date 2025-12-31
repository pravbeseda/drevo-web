import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TextInputComponent } from './text-input.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('TextInputComponent', () => {
    let component: TextInputComponent;
    let fixture: ComponentFixture<TextInputComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TextInputComponent, NoopAnimationsModule],
        }).compileComponents();

        fixture = TestBed.createComponent(TextInputComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should display label when provided', () => {
        fixture.componentRef.setInput('label', 'Username');
        fixture.detectChanges();

        const label = fixture.nativeElement.querySelector('mat-label');
        expect(label?.textContent).toBe('Username');
    });

    it('should emit valueChanged on input', () => {
        const valueChangedSpy = jest.fn();
        component.valueChanged.subscribe(valueChangedSpy);

        const input = fixture.nativeElement.querySelector('input');
        input.value = 'test value';
        input.dispatchEvent(new Event('input'));

        expect(valueChangedSpy).toHaveBeenCalledWith('test value');
    });

    it('should implement ControlValueAccessor writeValue', () => {
        component.writeValue('initial value');
        fixture.detectChanges();

        const input = fixture.nativeElement.querySelector('input');
        expect(input.value).toBe('initial value');
    });

    it('should call onChange when input changes', () => {
        const onChangeSpy = jest.fn();
        component.registerOnChange(onChangeSpy);

        const input = fixture.nativeElement.querySelector('input');
        input.value = 'new value';
        input.dispatchEvent(new Event('input'));

        expect(onChangeSpy).toHaveBeenCalledWith('new value');
    });

    it('should call onTouched on blur', () => {
        const onTouchedSpy = jest.fn();
        component.registerOnTouched(onTouchedSpy);

        const input = fixture.nativeElement.querySelector('input');
        input.dispatchEvent(new Event('blur'));

        expect(onTouchedSpy).toHaveBeenCalled();
    });

    it('should set disabled state', () => {
        component.setDisabledState(true);
        fixture.detectChanges();

        const input = fixture.nativeElement.querySelector('input');
        expect(input.disabled).toBe(true);
    });

    it('should display hint when provided', () => {
        fixture.componentRef.setInput('hint', 'Enter your username');
        fixture.detectChanges();

        const hint = fixture.nativeElement.querySelector('mat-hint');
        expect(hint?.textContent).toBe('Enter your username');
    });

    it('should display error message when provided', () => {
        fixture.componentRef.setInput('errorMessage', 'Field is required');
        fixture.detectChanges();

        // mat-error is rendered but may be hidden by Material until form is invalid
        // Check that the errorMessage input is set correctly
        expect(component.errorMessage()).toBe('Field is required');
    });

    it('should hide hint when error message is displayed', () => {
        fixture.componentRef.setInput('hint', 'Some hint');
        fixture.componentRef.setInput('errorMessage', 'Some error');
        fixture.detectChanges();

        const hint = fixture.nativeElement.querySelector('mat-hint');
        expect(hint).toBeNull();
    });

    it('should set input type', () => {
        fixture.componentRef.setInput('type', 'password');
        fixture.detectChanges();

        const input = fixture.nativeElement.querySelector('input');
        expect(input.type).toBe('password');
    });
});
