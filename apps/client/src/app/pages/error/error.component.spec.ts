import { provideRouter } from '@angular/router';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { ErrorComponent } from './error.component';

describe('ErrorComponent', () => {
    let spectator: Spectator<ErrorComponent>;
    const createComponent = createComponentFactory({
        component: ErrorComponent,
        providers: [provideRouter([])],
    });

    beforeEach(() => {
        spectator = createComponent();
    });

    it('should create', () => {
        expect(spectator.component).toBeTruthy();
    });

    it('should display default title', () => {
        expect(spectator.query('.error-title')).toHaveText(
            'Страница не найдена'
        );
    });

    it('should display default message', () => {
        expect(spectator.query('.error-message')).toHaveText(
            'Запрашиваемая страница не существует или была удалена.'
        );
    });

    it('should display custom title', () => {
        spectator = createComponent({
            props: { title: 'Ошибка загрузки' },
        });
        expect(spectator.query('.error-title')).toHaveText('Ошибка загрузки');
    });

    it('should display custom message', () => {
        spectator = createComponent({
            props: { message: 'Произошла ошибка при загрузке данных' },
        });
        expect(spectator.query('.error-message')).toHaveText(
            'Произошла ошибка при загрузке данных'
        );
    });

    it('should not show home button by default', () => {
        expect(spectator.query('.home-button')).toBeFalsy();
    });

    it('should hide home button when showHomeButton is false', () => {
        spectator = createComponent({
            props: { showHomeButton: false },
        });
        expect(spectator.query('.home-button')).toBeFalsy();
    });

    it('should show home button with correct attributes when showHomeButton is true', () => {
        spectator = createComponent({
            props: { showHomeButton: true },
        });

        const homeButton = spectator.query('.home-button');
        expect(homeButton).toBeTruthy();
        expect(homeButton).toHaveAttribute('href', '/');
        expect(homeButton).toHaveText('На главную');
        expect(spectator.query('.home-button ui-icon')).toHaveAttribute(
            'name',
            'home'
        );
    });
});
