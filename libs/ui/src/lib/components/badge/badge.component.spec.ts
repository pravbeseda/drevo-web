import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { BadgeComponent } from './badge.component';

describe('BadgeComponent', () => {
    let spectator: Spectator<BadgeComponent>;

    const createComponent = createComponentFactory({
        component: BadgeComponent,
    });

    it('should create', () => {
        spectator = createComponent({ props: { value: 5 } });
        expect(spectator.component).toBeTruthy();
    });

    it('should display numeric value', () => {
        spectator = createComponent({ props: { value: 3 } });
        expect(spectator.element.textContent?.trim()).toBe('3');
    });

    it('should display string value', () => {
        spectator = createComponent({ props: { value: 'new' } });
        expect(spectator.element.textContent?.trim()).toBe('new');
    });

    it('should display zero value', () => {
        spectator = createComponent({ props: { value: 0 } });
        expect(spectator.element.textContent?.trim()).toBe('0');
    });

    it('should not display content when value is undefined', () => {
        spectator = createComponent({ props: { value: undefined } });
        expect(spectator.element.textContent?.trim()).toBe('');
    });
});
