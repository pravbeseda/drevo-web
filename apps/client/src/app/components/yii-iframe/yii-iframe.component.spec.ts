import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';
import { ɵbypassSanitizationTrustResourceUrl } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { YiiIframeComponent } from './yii-iframe.component';

describe('YiiIframeComponent', () => {
    let spectator: Spectator<YiiIframeComponent>;
    let mockRouter: jest.Mocked<Router>;
    let mockSanitizer: jest.Mocked<DomSanitizer>;
    const createComponent = createComponentFactory({
        component: YiiIframeComponent,
        detectChanges: false,
    });

    beforeEach(() => {
        const routerEvents$ = new Subject<NavigationEnd>();

        mockRouter = {
            url: '/test-path',
            events: routerEvents$.asObservable(),
            navigateByUrl: jest.fn().mockResolvedValue(true),
        } as unknown as jest.Mocked<Router>;

        mockSanitizer = {
            bypassSecurityTrustResourceUrl: jest.fn((value: string) =>
                ɵbypassSanitizationTrustResourceUrl(value)
            ),
        } as unknown as jest.Mocked<DomSanitizer>;

        spectator = createComponent({
            providers: [
                { provide: Router, useValue: mockRouter },
                { provide: DomSanitizer, useValue: mockSanitizer },
            ],
        });
    });

    it('should create', () => {
        expect(spectator.component).toBeTruthy();
    });

    it('should initialize iframe source on init', () => {
        spectator.detectChanges();
        expect(mockSanitizer.bypassSecurityTrustResourceUrl).toHaveBeenCalledWith('/legacy/test-path');
    });

    it('should handle iframe load event', () => {
        spectator.component.isLoading = true;
        spectator.component.onIframeLoad();
        expect(spectator.component.isLoading).toBe(false);
        expect(spectator.component.hasError).toBe(false);
    });

    it('should handle iframe error event', () => {
        spectator.component.isLoading = true;
        spectator.component.onIframeError();
        expect(spectator.component.isLoading).toBe(false);
        expect(spectator.component.hasError).toBe(true);
        expect(spectator.component.errorMessage).toBeTruthy();
    });

    it('should reload iframe when reload is called', () => {
        const updateSpy = jest.spyOn(spectator.component as never, 'updateIframeSrc');
        spectator.component.reload();
        expect(updateSpy).toHaveBeenCalled();
    });
});
