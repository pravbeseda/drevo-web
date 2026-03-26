import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { PageTitleStrategy } from './page-title.strategy';

function makeRoute(data: Record<string, unknown> = {}): ActivatedRouteSnapshot {
    return { firstChild: null, data } as unknown as ActivatedRouteSnapshot;
}

function makeSnapshot(...routes: ActivatedRouteSnapshot[]): RouterStateSnapshot {
    if (routes.length === 0) {
        return { root: makeRoute() } as unknown as RouterStateSnapshot;
    }

    // Link routes into parent→child chain
    for (let i = 0; i < routes.length - 1; i++) {
        (routes[i] as { firstChild: ActivatedRouteSnapshot | null }).firstChild = routes[i + 1];
    }

    return { root: routes[0] } as unknown as RouterStateSnapshot;
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

    describe('updateTitle with buildTitle', () => {
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
    });

    describe('titlePrefix', () => {
        it('should apply titlePrefix to document title but not to pageTitle', () => {
            const titleService = spectator.inject(Title);
            jest.spyOn(spectator.service, 'buildTitle').mockReturnValue('Берёза');

            spectator.service.updateTitle(makeSnapshot(makeRoute({ titlePrefix: '#' })));

            expect(spectator.service.pageTitle()).toBe('Берёза');
            expect(titleService.setTitle).toHaveBeenCalledWith('# Берёза - Древо');
        });

        it('should not apply titlePrefix when route has no title', () => {
            const titleService = spectator.inject(Title);
            jest.spyOn(spectator.service, 'buildTitle').mockReturnValue(undefined);

            spectator.service.updateTitle(makeSnapshot(makeRoute({ titlePrefix: '#' })));

            expect(spectator.service.pageTitle()).toBe('Древо');
            expect(titleService.setTitle).toHaveBeenCalledWith('Древо');
        });
    });

    describe('titleSource', () => {
        it('should read title from resolved route data when titleSource is set', () => {
            const titleService = spectator.inject(Title);
            jest.spyOn(spectator.service, 'buildTitle').mockReturnValue(undefined);

            const route = makeRoute({
                titleSource: 'article',
                article: { title: 'Фотосинтез' },
            });
            spectator.service.updateTitle(makeSnapshot(route));

            expect(spectator.service.pageTitle()).toBe('Фотосинтез');
            expect(titleService.setTitle).toHaveBeenCalledWith('Фотосинтез - Древо');
        });

        it('should prefer buildTitle over titleSource when both are available', () => {
            const titleService = spectator.inject(Title);
            jest.spyOn(spectator.service, 'buildTitle').mockReturnValue('История версий: Фотосинтез');

            const route = makeRoute({
                titleSource: 'article',
                article: { title: 'Фотосинтез' },
            });
            spectator.service.updateTitle(makeSnapshot(route));

            expect(spectator.service.pageTitle()).toBe('История версий: Фотосинтез');
            expect(titleService.setTitle).toHaveBeenCalledWith('История версий: Фотосинтез - Древо');
        });

        it('should find titleSource on parent route when leaf has no titleSource', () => {
            jest.spyOn(spectator.service, 'buildTitle').mockReturnValue(undefined);

            const parent = makeRoute({
                titleSource: 'article',
                article: { title: 'Берёза' },
            });
            const child = makeRoute();
            spectator.service.updateTitle(makeSnapshot(parent, child));

            expect(spectator.service.pageTitle()).toBe('Берёза');
        });

        it('should fall back to default when titleSource points to missing data', () => {
            const titleService = spectator.inject(Title);
            jest.spyOn(spectator.service, 'buildTitle').mockReturnValue(undefined);

            const route = makeRoute({ titleSource: 'article' });
            spectator.service.updateTitle(makeSnapshot(route));

            expect(spectator.service.pageTitle()).toBe('Древо');
            expect(titleService.setTitle).toHaveBeenCalledWith('Древо');
        });

        it('should apply titlePrefix together with titleSource', () => {
            const titleService = spectator.inject(Title);
            jest.spyOn(spectator.service, 'buildTitle').mockReturnValue(undefined);

            const route = makeRoute({
                titleSource: 'version',
                titlePrefix: '*',
                version: { title: 'Берёза' },
            });
            spectator.service.updateTitle(makeSnapshot(route));

            expect(spectator.service.pageTitle()).toBe('Берёза');
            expect(titleService.setTitle).toHaveBeenCalledWith('* Берёза - Древо');
        });

        it('should truncate long title in document title but keep full title in pageTitle signal', () => {
            const titleService = spectator.inject(Title);
            jest.spyOn(spectator.service, 'buildTitle').mockReturnValue(undefined);

            const longTitle = 'А'.repeat(60);
            const route = makeRoute({
                titleSource: 'article',
                article: { title: longTitle },
            });
            spectator.service.updateTitle(makeSnapshot(route));

            expect(spectator.service.pageTitle()).toBe(longTitle);
            expect(titleService.setTitle).toHaveBeenCalledWith('А'.repeat(50) + '… - Древо');
        });

        it('should not truncate short title in document title', () => {
            const titleService = spectator.inject(Title);
            jest.spyOn(spectator.service, 'buildTitle').mockReturnValue(undefined);

            const route = makeRoute({
                titleSource: 'article',
                article: { title: 'Берёза' },
            });
            spectator.service.updateTitle(makeSnapshot(route));

            expect(spectator.service.pageTitle()).toBe('Берёза');
            expect(titleService.setTitle).toHaveBeenCalledWith('Берёза - Древо');
        });

        it('should not inherit titlePrefix from parent route', () => {
            const titleService = spectator.inject(Title);
            jest.spyOn(spectator.service, 'buildTitle').mockReturnValue(undefined);

            const parent = makeRoute({
                titleSource: 'article',
                titlePrefix: '*',
                article: { title: 'Берёза' },
            });
            const child = makeRoute({
                titleSource: 'tab',
                tab: { title: 'История версий' },
            });
            spectator.service.updateTitle(makeSnapshot(parent, child));

            expect(spectator.service.pageTitle()).toBe('История версий');
            expect(titleService.setTitle).toHaveBeenCalledWith('История версий - Древо');
        });
    });
});
