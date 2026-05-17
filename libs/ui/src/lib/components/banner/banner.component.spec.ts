import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';

import { BannerComponent } from './banner.component';

describe('BannerComponent', () => {
    let spectator: Spectator<BannerComponent>;
    const createComponent = createComponentFactory({
        component: BannerComponent,
    });

    beforeEach(() => {
        spectator = createComponent();
    });

    it('should create', () => {
        expect(spectator.component).toBeTruthy();
    });
});
