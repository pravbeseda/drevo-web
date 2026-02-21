import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { PageTitleStrategy } from './page-title.strategy';

function makeSnapshot(titlePrefix?: string): RouterStateSnapshot {
    const data: Record<string, unknown> = titlePrefix !== undefined ? { titlePrefix } : {};
    return {
        root: { firstChild: null, data } as unknown as ActivatedRouteSnapshot,
    } as unknown as RouterStateSnapshot;
}

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

            spectator.service.updateTitle(makeSnapshot());

            expect(spectator.service.pageTitle()).toBe('Главная');
            expect(titleService.setTitle).toHaveBeenCalledWith('Главная - Древо');
        });

        it('should reset to default when route has no title', () => {
            const titleService = spectator.inject(Title);
            jest.spyOn(spectator.service, 'buildTitle').mockReturnValue(undefined);

            spectator.service.updateTitle(makeSnapshot());

            expect(spectator.service.pageTitle()).toBe('Древо');
            expect(titleService.setTitle).toHaveBeenCalledWith('Древо');
        });

        it('should reset to default after navigating from titled route to untitled route', () => {
            const titleService = spectator.inject(Title);
            const buildTitleSpy = jest.spyOn(spectator.service, 'buildTitle');

            buildTitleSpy.mockReturnValue('Статья');
            spectator.service.updateTitle(makeSnapshot());
            expect(spectator.service.pageTitle()).toBe('Статья');

            buildTitleSpy.mockReturnValue(undefined);
            spectator.service.updateTitle(makeSnapshot());
            expect(spectator.service.pageTitle()).toBe('Древо');
            expect(titleService.setTitle).toHaveBeenLastCalledWith('Древо');
        });

        it('should apply titlePrefix to document title but not to pageTitle', () => {
            const titleService = spectator.inject(Title);
            jest.spyOn(spectator.service, 'buildTitle').mockReturnValue('Берёза');

            spectator.service.updateTitle(makeSnapshot('#'));

            expect(spectator.service.pageTitle()).toBe('Берёза');
            expect(titleService.setTitle).toHaveBeenCalledWith('# Берёза - Древо');
        });

        it('should not apply titlePrefix when route has no title', () => {
            const titleService = spectator.inject(Title);
            jest.spyOn(spectator.service, 'buildTitle').mockReturnValue(undefined);

            spectator.service.updateTitle(makeSnapshot('#'));

            expect(spectator.service.pageTitle()).toBe('Древо');
            expect(titleService.setTitle).toHaveBeenCalledWith('Древо');
        });

        it('should work without titlePrefix (undefined data)', () => {
            const titleService = spectator.inject(Title);
            jest.spyOn(spectator.service, 'buildTitle').mockReturnValue('История');

            spectator.service.updateTitle(makeSnapshot());

            expect(spectator.service.pageTitle()).toBe('История');
            expect(titleService.setTitle).toHaveBeenCalledWith('История - Древо');
        });
    });
});
