import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';
import { MainComponent } from './main.component';

describe('MainComponent', () => {
    let spectator: Spectator<MainComponent>;
    const createComponent = createComponentFactory(MainComponent);

    it('should create', () => {
        spectator = createComponent();

        expect(spectator.component).toBeTruthy();
    });
});
