import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { MockProvider } from 'ng-mocks';
import { PageTitleStrategy } from './services/page-title.strategy';
import { AppComponent } from './app.component';

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
