import { AppComponent } from './app.component';
import { AppUpdateService } from './services/app-update/app-update.service';
import { PageTitleStrategy } from './services/page-title.strategy';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { MockProvider } from 'ng-mocks';

describe('AppComponent', () => {
    let spectator: Spectator<AppComponent>;

    const createComponent = createComponentFactory({
        component: AppComponent,
        providers: [
            provideHttpClient(),
            provideHttpClientTesting(),
            provideRouter([]),
            MockProvider(PageTitleStrategy, {
                pageTitle: signal('Древо'),
            }),
            MockProvider(AppUpdateService, {
                chunkLoadFailed: signal(false).asReadonly(),
                reload: jest.fn(),
            }),
        ],
    });

    beforeEach(() => {
        spectator = createComponent();
    });

    it('should create', () => {
        expect(spectator.component).toBeTruthy();
    });

    it('should show layout by default', () => {
        expect(spectator.component.showLayout()).toBe(true);
    });

    it('should render app-layout when showLayout is true', () => {
        expect(spectator.query('app-layout')).toExist();
    });
});
