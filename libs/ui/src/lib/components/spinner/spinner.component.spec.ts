import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { SpinnerComponent } from './spinner.component';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

describe('SpinnerComponent', () => {
    let spectator: Spectator<SpinnerComponent>;

    const createComponent = createComponentFactory({
        component: SpinnerComponent,
        imports: [MatProgressSpinner],
    });

    beforeEach(() => {
        spectator = createComponent();
    });

    it('should create', () => {
        expect(spectator.component).toBeTruthy();
    });

    it('should have default diameter of 40', () => {
        expect(spectator.component.diameter()).toBe(40);
    });

    it('should have default strokeWidth of 4', () => {
        expect(spectator.component.strokeWidth()).toBe(4);
    });

    it('should render mat-spinner element', () => {
        expect(spectator.query('mat-spinner')).toBeTruthy();
    });

    it('should apply custom diameter', () => {
        spectator.setInput('diameter', 60);
        spectator.detectChanges();

        const spinner = spectator.query('mat-spinner');
        expect(spinner).toBeTruthy();
        expect(spectator.component.diameter()).toBe(60);
    });

    it('should apply custom strokeWidth', () => {
        spectator.setInput('strokeWidth', 8);
        spectator.detectChanges();

        expect(spectator.component.strokeWidth()).toBe(8);
    });

    describe('with different input values', () => {
        it('should accept small diameter', () => {
            spectator.setInput('diameter', 20);
            spectator.detectChanges();

            expect(spectator.component.diameter()).toBe(20);
        });

        it('should accept large diameter', () => {
            spectator.setInput('diameter', 100);
            spectator.detectChanges();

            expect(spectator.component.diameter()).toBe(100);
        });

        it('should accept thin strokeWidth', () => {
            spectator.setInput('strokeWidth', 2);
            spectator.detectChanges();

            expect(spectator.component.strokeWidth()).toBe(2);
        });

        it('should accept thick strokeWidth', () => {
            spectator.setInput('strokeWidth', 10);
            spectator.detectChanges();

            expect(spectator.component.strokeWidth()).toBe(10);
        });
    });
});
