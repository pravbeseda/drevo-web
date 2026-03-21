import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { PictureSearchBarComponent } from './picture-search-bar.component';

describe('PictureSearchBarComponent', () => {
    let spectator: Spectator<PictureSearchBarComponent>;

    const createComponent = createComponentFactory({
        component: PictureSearchBarComponent,
    });

    beforeEach(() => {
        spectator = createComponent();
    });

    it('should create', () => {
        expect(spectator.component).toBeTruthy();
    });

    it('should emit searchChange when input value changes', () => {
        const spy = jest.spyOn(spectator.component.searchChange, 'emit');
        spectator.component.onValueChanged('храм');
        expect(spy).toHaveBeenCalledWith('храм');
    });
});
