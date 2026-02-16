import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot } from '@angular/router';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { PageTitleStrategy } from './page-title.strategy';

describe('PageTitleStrategy', () => {
    let spectator: SpectatorService<PageTitleStrategy>;
    const createService = createServiceFactory({
        service: PageTitleStrategy,
        providers: [mockLoggerProvider()],
        mocks: [Title],
    });

    beforeEach(() => {
        spectator = createService();
    });

    it('should be created', () => {
        expect(spectator.service).toBeTruthy();
    });

    it('should have default pageTitle "Древо"', () => {
        expect(spectator.service.pageTitle()).toBe('Древо');
    });

    describe('updateTitle', () => {
        it('should set pageTitle signal and document title with suffix when route has title', () => {
            const titleService = spectator.inject(Title);
            jest.spyOn(spectator.service, 'buildTitle').mockReturnValue('Главная');

            spectator.service.updateTitle({} as RouterStateSnapshot);

            expect(spectator.service.pageTitle()).toBe('Главная');
            expect(titleService.setTitle).toHaveBeenCalledWith('Главная - Древо');
        });

        it('should reset to default when route has no title', () => {
            const titleService = spectator.inject(Title);
            jest.spyOn(spectator.service, 'buildTitle').mockReturnValue(undefined);

            spectator.service.updateTitle({} as RouterStateSnapshot);

            expect(spectator.service.pageTitle()).toBe('Древо');
            expect(titleService.setTitle).toHaveBeenCalledWith('Древо');
        });

        it('should reset to default after navigating from titled route to untitled route', () => {
            const titleService = spectator.inject(Title);
            const buildTitleSpy = jest.spyOn(spectator.service, 'buildTitle');

            buildTitleSpy.mockReturnValue('Статья');
            spectator.service.updateTitle({} as RouterStateSnapshot);
            expect(spectator.service.pageTitle()).toBe('Статья');

            buildTitleSpy.mockReturnValue(undefined);
            spectator.service.updateTitle({} as RouterStateSnapshot);
            expect(spectator.service.pageTitle()).toBe('Древо');
            expect(titleService.setTitle).toHaveBeenLastCalledWith('Древо');
        });
    });
});
