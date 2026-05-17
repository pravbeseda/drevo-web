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

    it('should project content', () => {
        spectator = createComponent({
            props: {},
            detectChanges: false,
        });

        spectator.fixture.nativeElement.innerHTML = '<span class="test">Hello</span>';
        spectator.detectChanges();

        expect(spectator.element).toBeTruthy();
    });
});
