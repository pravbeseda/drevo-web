import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';

import { LayoutComponent } from './layout.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('LayoutComponent', () => {
    let spectator: Spectator<LayoutComponent>;
    const createComponent = createComponentFactory({
        component: LayoutComponent,
        providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    it('should create', () => {
        spectator = createComponent();

        expect(spectator.component).toBeTruthy();
    });
});
