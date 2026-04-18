import { AppComponent } from './app.component';
import { AppUpdateService } from './services/app-update/app-update.service';
import { PageTitleStrategy } from './services/page-title.strategy';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { NavigationError, provideRouter, Router } from '@angular/router';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { MockProvider } from 'ng-mocks';
import { Subject } from 'rxjs';

describe('AppComponent', () => {
    let spectator: Spectator<AppComponent>;
    let appUpdateService: jest.Mocked<AppUpdateService>;
    const routerEvents$ = new Subject<unknown>();

    const createComponent = createComponentFactory({
        component: AppComponent,
        providers: [
            provideHttpClient(),
            provideHttpClientTesting(),
            provideRouter([]),
            MockProvider(Router, { events: routerEvents$.asObservable(), routerState: { root: {} } as never }),
            MockProvider(PageTitleStrategy, {
                pageTitle: signal('Древо'),
            }),
            MockProvider(AppUpdateService, {
                notifyChunkLoadFailure: jest.fn(),
                chunkLoadFailed: signal(false).asReadonly(),
                reload: jest.fn(),
            }),
        ],
    });

    beforeEach(() => {
        spectator = createComponent();
        appUpdateService = spectator.inject(AppUpdateService) as jest.Mocked<AppUpdateService>;
        appUpdateService.notifyChunkLoadFailure.mockClear();
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

    it('should notify AppUpdateService on NavigationError with chunk load error', () => {
        const error = new Error('Loading chunk 3 failed');

        routerEvents$.next(new NavigationError(1, '/profile', error));

        expect(appUpdateService.notifyChunkLoadFailure).toHaveBeenCalledWith(error, {
            url: '/profile',
        });
    });

    it('should ignore NavigationError with non-chunk errors', () => {
        routerEvents$.next(new NavigationError(2, '/x', new TypeError('boom')));

        expect(appUpdateService.notifyChunkLoadFailure).not.toHaveBeenCalled();
    });
});
