import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IconButtonComponent } from './icon-button.component';

describe('IconButtonComponent', () => {
    let component: IconButtonComponent;
    let fixture: ComponentFixture<IconButtonComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [IconButtonComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(IconButtonComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('icon', 'settings');
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should emit clicked event on click', () => {
        const clickedSpy = jest.fn();
        component.clicked.subscribe(clickedSpy);

        component.onClick();

        expect(clickedSpy).toHaveBeenCalled();
    });

    it('should display the icon', () => {
        expect(component.icon()).toBe('settings');
    });

    it('should have label as aria-label', () => {
        fixture.componentRef.setInput('label', 'Settings');
        fixture.detectChanges();

        expect(component.label()).toBe('Settings');
    });
});
