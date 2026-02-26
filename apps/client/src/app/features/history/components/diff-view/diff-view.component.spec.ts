import { mockLoggerProvider } from '@drevo-web/core/testing';
import { ApprovalStatus, VersionPairs } from '@drevo-web/shared';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { signal, WritableSignal } from '@angular/core';
import { DiffPageDataService } from '../../services/diff-page-data.service';
import { DiffViewComponent } from './diff-view.component';

const mockVersionPairs: VersionPairs = {
    current: {
        articleId: 1,
        versionId: 200,
        content: 'new content',
        author: 'Author A',
        date: new Date('2025-01-15T14:30:00'),
        title: 'Test Article',
        info: 'Updated text',
        approved: ApprovalStatus.Pending,
    },
    previous: {
        articleId: 1,
        versionId: 199,
        content: 'old content',
        author: 'Author B',
        date: new Date('2025-01-14T10:00:00'),
        title: 'Test Article',
        info: '',
        approved: ApprovalStatus.Approved,
    },
};

function createMockDataService(pairs: VersionPairs | undefined = mockVersionPairs): {
    service: Partial<DiffPageDataService>;
    versionPairsSignal: WritableSignal<VersionPairs | undefined>;
} {
    const versionPairsSignal = signal<VersionPairs | undefined>(pairs);
    return {
        service: {
            isLoading: signal(false).asReadonly(),
            error: signal(undefined).asReadonly(),
            versionPairs: versionPairsSignal.asReadonly(),
        },
        versionPairsSignal,
    };
}

describe('DiffViewComponent', () => {
    let spectator: Spectator<DiffViewComponent>;
    let versionPairsSignal: WritableSignal<VersionPairs | undefined>;

    const mockData = createMockDataService();

    const createComponent = createComponentFactory({
        component: DiffViewComponent,
        providers: [
            mockLoggerProvider(),
            {
                provide: DiffPageDataService,
                useValue: mockData.service,
            },
        ],
        detectChanges: false,
    });

    beforeEach(() => {
        spectator = createComponent();
        versionPairsSignal = mockData.versionPairsSignal;
        versionPairsSignal.set(mockVersionPairs);
    });

    it('should create', () => {
        spectator.detectChanges();
        expect(spectator.component).toBeTruthy();
    });

    describe('collapsed mode', () => {
        it('should start with collapsed = true', () => {
            expect(spectator.component.collapsed()).toBe(true);
        });

        it('should toggle collapsed state on each call', () => {
            spectator.component.toggleCollapsed();
            expect(spectator.component.collapsed()).toBe(false);

            spectator.component.toggleCollapsed();
            expect(spectator.component.collapsed()).toBe(true);
        });

        describe('expanded rendering', () => {
            beforeEach(() => {
                spectator.component.toggleCollapsed();
            });

            it('should not collapse anything in expanded mode', () => {
                versionPairsSignal.set({
                    ...mockVersionPairs,
                    previous: { ...mockVersionPairs.previous, content: 'old\nunchanged1\nunchanged2\n' },
                    current: { ...mockVersionPairs.current, content: 'new\nunchanged1\nunchanged2\n' },
                });
                spectator.detectChanges();

                expect(spectator.component.diffHtml()).not.toContain('diff-collapsed-lines');
            });
        });

        describe('collapsed rendering', () => {
            it('should collapse group of 2+ consecutive unchanged lines', () => {
                versionPairsSignal.set({
                    ...mockVersionPairs,
                    previous: { ...mockVersionPairs.previous, content: 'old\nunchanged1\nunchanged2\n' },
                    current: { ...mockVersionPairs.current, content: 'new\nunchanged1\nunchanged2\n' },
                });
                spectator.detectChanges();

                expect(spectator.component.diffHtml()).toContain('Строк без изменений: 2');
            });

            it('should show the correct count in the collapsed block', () => {
                versionPairsSignal.set({
                    ...mockVersionPairs,
                    previous: {
                        ...mockVersionPairs.previous,
                        content: 'old\nunchanged1\nunchanged2\nunchanged3\nunchanged4\n',
                    },
                    current: {
                        ...mockVersionPairs.current,
                        content: 'new\nunchanged1\nunchanged2\nunchanged3\nunchanged4\n',
                    },
                });
                spectator.detectChanges();

                expect(spectator.component.diffHtml()).toContain('Строк без изменений: 4');
            });

            it('should NOT collapse a single unchanged line', () => {
                versionPairsSignal.set({
                    ...mockVersionPairs,
                    previous: { ...mockVersionPairs.previous, content: 'old1\nunchanged\nold2\n' },
                    current: { ...mockVersionPairs.current, content: 'new1\nunchanged\nnew2\n' },
                });
                spectator.detectChanges();

                expect(spectator.component.diffHtml()).not.toContain('diff-collapsed-lines');
            });

            it('should show changed lines with insert and delete spans', () => {
                versionPairsSignal.set({
                    ...mockVersionPairs,
                    previous: { ...mockVersionPairs.previous, content: 'old\nunchanged1\nunchanged2\n' },
                    current: { ...mockVersionPairs.current, content: 'new\nunchanged1\nunchanged2\n' },
                });
                spectator.detectChanges();

                const html = spectator.component.diffHtml();
                expect(html).toContain('diff-delete');
                expect(html).toContain('diff-insert');
            });

            it('should not create highlighted spans for whitespace-only changes', () => {
                versionPairsSignal.set({
                    ...mockVersionPairs,
                    previous: { ...mockVersionPairs.previous, content: 'text\n   \n' },
                    current: { ...mockVersionPairs.current, content: 'text\n\t\n' },
                });
                spectator.detectChanges();

                const html = spectator.component.diffHtml();
                expect(html).not.toMatch(/<span class="diff-(insert|delete)">\s*<\/span>/);
            });
        });
    });
});
