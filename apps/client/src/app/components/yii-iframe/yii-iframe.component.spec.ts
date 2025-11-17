import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';
import { NavigationEnd, Router } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { YiiIframeComponent } from './yii-iframe.component';
import { LoggerService } from '../../services/logger/logger.service';

describe('YiiIframeComponent', () => {
    let spectator: Spectator<YiiIframeComponent>;
    let mockRouter: jest.Mocked<Router>;
    let mockLogger: jest.Mocked<LoggerService>;
    let sanitizer: DomSanitizer;
    let bypassSecurityTrustResourceUrlSpy: jest.SpiedFunction<DomSanitizer['bypassSecurityTrustResourceUrl']>;
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

        mockLogger = {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        } as unknown as jest.Mocked<LoggerService>;

        spectator = createComponent({
            providers: [
                { provide: Router, useValue: mockRouter },
                { provide: LoggerService, useValue: mockLogger },
            ],
        });

        sanitizer = spectator.inject(DomSanitizer);
        bypassSecurityTrustResourceUrlSpy = jest.spyOn(
            sanitizer,
            'bypassSecurityTrustResourceUrl'
        );
    });

    it('should create', () => {
        expect(spectator.component).toBeTruthy();
    });

    it('should initialize iframe source on init', () => {
        spectator.detectChanges();
        expect(
            bypassSecurityTrustResourceUrlSpy
        ).toHaveBeenCalledWith('/legacy/test-path');
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
        const updateSpy = jest.spyOn(
            spectator.component as never,
            'updateIframeSrc'
        );
        spectator.component.reload();
        expect(updateSpy).toHaveBeenCalled();
    });
});
