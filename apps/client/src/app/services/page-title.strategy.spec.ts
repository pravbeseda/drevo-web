import { PageTitleStrategy } from './page-title.strategy';
import { ArticleService } from './articles';
import { Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { MockProvider } from 'ng-mocks';
import { Subject } from 'rxjs';

function makeRoute(data: Record<string, unknown> = {}): ActivatedRouteSnapshot {
    return { firstChild: null, data } as unknown as ActivatedRouteSnapshot;
}

function makeSnapshot(...routes: ActivatedRouteSnapshot[]): RouterStateSnapshot {
    if (routes.length === 0) {
        return { root: makeRoute() } as unknown as RouterStateSnapshot;
    }

    for (let i = 0; i < routes.length - 1; i++) {
        (routes[i] as { firstChild: ActivatedRouteSnapshot | null }).firstChild = routes[i + 1];
    }

    return { root: routes[0] } as unknown as RouterStateSnapshot;
}

describe('PageTitleStrategy', () => {
    let spectator: SpectatorService<PageTitleStrategy>;
    let renamedSubject: Subject<{ articleId: number; title: string }>;
    const createService = createServiceFactory({
        service: PageTitleStrategy,
        providers: [
            mockLoggerProvider(),
            MockProvider(ArticleService, {
                get renamed$() {
                    return renamedSubject.asObservable();
                },
            }),
        ],
        mocks: [Title],
    });

    beforeEach(() => {
        renamedSubject = new Subject();
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
        it('should read title from resolved article data when titleSource is set', () => {
            const titleService = spectator.inject(Title);
            jest.spyOn(spectator.service, 'buildTitle').mockReturnValue(undefined);

            const route = makeRoute({
                titleSource: 'article',
                article: { articleId: 42, title: 'Фотосинтез' },
            });
            spectator.service.updateTitle(makeSnapshot(route));

            expect(spectator.service.pageTitle()).toBe('Фотосинтез');
            expect(titleService.setTitle).toHaveBeenCalledWith('Фотосинтез - Древо');
        });

        it('should compose tab title with article title when both are present', () => {
            const titleService = spectator.inject(Title);
            jest.spyOn(spectator.service, 'buildTitle').mockReturnValue('История версий');

            const parent = makeRoute({
                titleSource: 'article',
                article: { articleId: 42, title: 'Фотосинтез' },
            });
            const child = makeRoute();
            spectator.service.updateTitle(makeSnapshot(parent, child));

            expect(spectator.service.pageTitle()).toBe('История версий: Фотосинтез');
            expect(titleService.setTitle).toHaveBeenCalledWith('История версий: Фотосинтез - Древо');
        });

        it('should find titleSource on parent route when leaf has no titleSource', () => {
            jest.spyOn(spectator.service, 'buildTitle').mockReturnValue(undefined);

            const parent = makeRoute({
                titleSource: 'article',
                article: { articleId: 1, title: 'Берёза' },
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
                article: { articleId: 1, title: longTitle },
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
                article: { articleId: 1, title: 'Берёза' },
            });
            spectator.service.updateTitle(makeSnapshot(route));

            expect(spectator.service.pageTitle()).toBe('Берёза');
            expect(titleService.setTitle).toHaveBeenCalledWith('Берёза - Древо');
        });

        it('should set titleContext when titleSource is article with articleId', () => {
            jest.spyOn(spectator.service, 'buildTitle').mockReturnValue(undefined);

            const route = makeRoute({
                titleSource: 'article',
                article: { articleId: 42, title: 'Фотосинтез' },
            });
            spectator.service.updateTitle(makeSnapshot(route));

            expect(spectator.service.titleContext()).toEqual({ articleId: 42, title: 'Фотосинтез' });
        });

        it('should reset titleContext when navigating to non-article page', () => {
            jest.spyOn(spectator.service, 'buildTitle').mockReturnValue(undefined);

            const articleRoute = makeRoute({
                titleSource: 'article',
                article: { articleId: 42, title: 'Фотосинтез' },
            });
            spectator.service.updateTitle(makeSnapshot(articleRoute));
            expect(spectator.service.titleContext()).toBeTruthy();

            jest.spyOn(spectator.service, 'buildTitle').mockReturnValue('Главная');
            spectator.service.updateTitle(makeSnapshot(makeRoute()));
            expect(spectator.service.titleContext()).toBeUndefined();
        });

        it('should reset titleContext when titleSource is not article', () => {
            jest.spyOn(spectator.service, 'buildTitle').mockReturnValue(undefined);

            const route = makeRoute({
                titleSource: 'version',
                version: { title: 'Берёза' },
            });
            spectator.service.updateTitle(makeSnapshot(route));

            expect(spectator.service.titleContext()).toBeUndefined();
        });

        it('should not inherit titlePrefix from parent route', () => {
            const titleService = spectator.inject(Title);
            jest.spyOn(spectator.service, 'buildTitle').mockReturnValue('История версий');

            const parent = makeRoute({
                titleSource: 'article',
                titlePrefix: '*',
                article: { articleId: 1, title: 'Берёза' },
            });
            const child = makeRoute();
            spectator.service.updateTitle(makeSnapshot(parent, child));

            expect(spectator.service.pageTitle()).toBe('История версий: Берёза');
            expect(titleService.setTitle).toHaveBeenCalledWith('История версий: Берёза - Древо');
        });

        it('should preserve renamed titleContext when navigating between tabs of same article', () => {
            const titleService = spectator.inject(Title);
            const buildTitleSpy = jest.spyOn(spectator.service, 'buildTitle');

            // Initial nav to article page (no tab title).
            buildTitleSpy.mockReturnValue(undefined);
            const initial = makeRoute({
                titleSource: 'article',
                article: { articleId: 42, title: 'Старое' },
            });
            spectator.service.updateTitle(makeSnapshot(initial));

            // Rename — context updates, route snapshot still has old title.
            renamedSubject.next({ articleId: 42, title: 'Новое' });
            expect(spectator.service.titleContext()).toEqual({ articleId: 42, title: 'Новое' });

            // Navigate to "Версии" tab — parent snapshot carries STALE article data.
            buildTitleSpy.mockReturnValue('История версий');
            const staleParent = makeRoute({
                titleSource: 'article',
                article: { articleId: 42, title: 'Старое' },
            });
            const tabChild = makeRoute();
            spectator.service.updateTitle(makeSnapshot(staleParent, tabChild));

            expect(spectator.service.titleContext()).toEqual({ articleId: 42, title: 'Новое' });
            expect(spectator.service.pageTitle()).toBe('История версий: Новое');
            expect(titleService.setTitle).toHaveBeenLastCalledWith('История версий: Новое - Древо');
        });

        it('should refresh titleContext when navigating between different articles', () => {
            jest.spyOn(spectator.service, 'buildTitle').mockReturnValue(undefined);

            spectator.service.updateTitle(
                makeSnapshot(
                    makeRoute({
                        titleSource: 'article',
                        article: { articleId: 1, title: 'Берёза' },
                    }),
                ),
            );

            spectator.service.updateTitle(
                makeSnapshot(
                    makeRoute({
                        titleSource: 'article',
                        article: { articleId: 2, title: 'Сосна' },
                    }),
                ),
            );

            expect(spectator.service.titleContext()).toEqual({ articleId: 2, title: 'Сосна' });
        });
    });

    describe('rename event handling', () => {
        it('should update pageTitle and document title when rename event matches articleId', () => {
            const titleService = spectator.inject(Title);
            jest.spyOn(spectator.service, 'buildTitle').mockReturnValue(undefined);

            const route = makeRoute({
                titleSource: 'article',
                article: { articleId: 1, title: 'Старое' },
            });
            spectator.service.updateTitle(makeSnapshot(route));

            renamedSubject.next({ articleId: 1, title: 'Новое' });

            expect(spectator.service.pageTitle()).toBe('Новое');
            expect(titleService.setTitle).toHaveBeenCalledWith('Новое - Древо');
        });

        it('should update titleContext with new title on rename event', () => {
            jest.spyOn(spectator.service, 'buildTitle').mockReturnValue(undefined);

            const route = makeRoute({
                titleSource: 'article',
                article: { articleId: 1, title: 'Старое' },
            });
            spectator.service.updateTitle(makeSnapshot(route));

            renamedSubject.next({ articleId: 1, title: 'Новое' });

            expect(spectator.service.titleContext()).toEqual({ articleId: 1, title: 'Новое' });
        });

        it('should recompose pageTitle when rename arrives while on a tab', () => {
            const titleService = spectator.inject(Title);
            jest.spyOn(spectator.service, 'buildTitle').mockReturnValue('История версий');

            const parent = makeRoute({
                titleSource: 'article',
                article: { articleId: 1, title: 'Старое' },
            });
            const tabChild = makeRoute();
            spectator.service.updateTitle(makeSnapshot(parent, tabChild));
            expect(spectator.service.pageTitle()).toBe('История версий: Старое');

            renamedSubject.next({ articleId: 1, title: 'Новое' });

            expect(spectator.service.pageTitle()).toBe('История версий: Новое');
            expect(titleService.setTitle).toHaveBeenLastCalledWith('История версий: Новое - Древо');
        });

        it('should ignore rename event when no article context is active', () => {
            const titleService = spectator.inject(Title);
            jest.spyOn(spectator.service, 'buildTitle').mockReturnValue('Главная');
            spectator.service.updateTitle(makeSnapshot());
            (titleService.setTitle as jest.Mock).mockClear();

            renamedSubject.next({ articleId: 1, title: 'Новое' });

            expect(spectator.service.pageTitle()).toBe('Главная');
            expect(titleService.setTitle).not.toHaveBeenCalled();
        });

        it('should ignore rename event for a different articleId', () => {
            const titleService = spectator.inject(Title);
            jest.spyOn(spectator.service, 'buildTitle').mockReturnValue(undefined);

            const route = makeRoute({
                titleSource: 'article',
                article: { articleId: 1, title: 'Берёза' },
            });
            spectator.service.updateTitle(makeSnapshot(route));
            (titleService.setTitle as jest.Mock).mockClear();

            renamedSubject.next({ articleId: 99, title: 'Чужое' });

            expect(spectator.service.titleContext()).toEqual({ articleId: 1, title: 'Берёза' });
            expect(titleService.setTitle).not.toHaveBeenCalled();
        });

        it('should truncate long title in document title after rename', () => {
            const titleService = spectator.inject(Title);
            jest.spyOn(spectator.service, 'buildTitle').mockReturnValue(undefined);

            const route = makeRoute({
                titleSource: 'article',
                article: { articleId: 1, title: 'Short' },
            });
            spectator.service.updateTitle(makeSnapshot(route));

            const longTitle = 'Б'.repeat(60);
            renamedSubject.next({ articleId: 1, title: longTitle });

            expect(spectator.service.pageTitle()).toBe(longTitle);
            expect(titleService.setTitle).toHaveBeenCalledWith('Б'.repeat(50) + '… - Древо');
        });
    });
});
