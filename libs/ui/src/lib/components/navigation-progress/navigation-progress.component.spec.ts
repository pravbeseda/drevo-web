import { MatProgressBar } from '@angular/material/progress-bar';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { NavigationProgressComponent } from './navigation-progress.component';

describe('NavigationProgressComponent', () => {
    let spectator: Spectator<NavigationProgressComponent>;

    const createComponent = createComponentFactory({
        component: NavigationProgressComponent,
        imports: [MatProgressBar],
    });

    it('should create', () => {
        spectator = createComponent({ props: { isNavigating: false } });
        expect(spectator.component).toBeTruthy();
    });

    it('should render mat-progress-bar when isNavigating is true', () => {
        spectator = createComponent({ props: { isNavigating: true } });
        expect(spectator.query('[data-testid="navigation-progress"]')).toExist();
    });

    it('should not render mat-progress-bar when isNavigating is false', () => {
        spectator = createComponent({ props: { isNavigating: false } });
        expect(spectator.query('[data-testid="navigation-progress"]')).not.toExist();
    });
});
