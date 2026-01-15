import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router, NavigationEnd } from '@angular/router';
import { Subject } from 'rxjs';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
    let spectator: Spectator<AppComponent>;
    let routerEvents$: Subject<NavigationEnd>;

    const createComponent = createComponentFactory({
        component: AppComponent,
        providers: [
            provideHttpClient(),
            provideHttpClientTesting(),
            provideRouter([]),
        ],
    });

    beforeEach(() => {
        routerEvents$ = new Subject<NavigationEnd>();
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
