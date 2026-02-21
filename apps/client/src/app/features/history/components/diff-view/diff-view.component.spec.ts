import { DiffViewComponent } from './diff-view.component';
import { DiffPageDataService } from '../../services/diff-page-data.service';
import { ArticleService } from '../../../../services/articles/article.service';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { DIFF_ENGINES, VersionPairs } from '@drevo-web/shared';

const mockVersionPairs: VersionPairs = {
    current: {
        versionId: 200,
        content: 'new content',
        author: 'Author A',
        date: new Date('2025-01-15T14:30:00'),
        title: 'Test Article',
        info: 'Updated text',
    },
    previous: {
        versionId: 199,
        content: 'old content',
        author: 'Author B',
        date: new Date('2025-01-14T10:00:00'),
        title: 'Test Article',
        info: '',
    },
};

describe('DiffViewComponent', () => {
    let spectator: Spectator<DiffViewComponent>;

    const createComponent = createComponentFactory({
        component: DiffViewComponent,
        mocks: [ArticleService],
        providers: [
            mockLoggerProvider(),
            DiffPageDataService,
            {
                provide: ActivatedRoute,
                useValue: {
                    snapshot: {
                        paramMap: convertToParamMap({ id: '200' }),
                    },
                },
            },
        ],
        detectChanges: false,
    });

    beforeEach(() => {
        spectator = createComponent();
        const articleService = spectator.inject(ArticleService) as jest.Mocked<ArticleService>;
        articleService.getVersionPairs.mockReturnValue(of(mockVersionPairs));
    });

    it('should create', () => {
        spectator.detectChanges();
        expect(spectator.component).toBeTruthy();
    });

    describe('collapsed mode', () => {
        beforeEach(() => {
            spectator.component.onGranularityChange('lines');
        });

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
                const articleService = spectator.inject(ArticleService) as jest.Mocked<ArticleService>;
                articleService.getVersionPairs.mockReturnValue(
                    of({
                        ...mockVersionPairs,
                        previous: { ...mockVersionPairs.previous, content: 'old\nunchanged1\nunchanged2\n' },
                        current: { ...mockVersionPairs.current, content: 'new\nunchanged1\nunchanged2\n' },
                    }),
                );
                spectator.component.data.loadFromRoute();
                spectator.detectChanges();

                expect(spectator.component.diffHtml()).not.toContain('diff-collapsed-lines');
            });
        });

        describe('collapsed rendering', () => {
            it('should collapse group of 2+ consecutive unchanged lines', () => {
                const articleService = spectator.inject(ArticleService) as jest.Mocked<ArticleService>;
                articleService.getVersionPairs.mockReturnValue(
                    of({
                        ...mockVersionPairs,
                        previous: { ...mockVersionPairs.previous, content: 'old\nunchanged1\nunchanged2\n' },
                        current: { ...mockVersionPairs.current, content: 'new\nunchanged1\nunchanged2\n' },
                    }),
                );
                spectator.component.data.loadFromRoute();
                spectator.detectChanges();

                expect(spectator.component.diffHtml()).toContain('Строк без изменений: 2');
            });

            it('should show the correct count in the collapsed block', () => {
                const articleService = spectator.inject(ArticleService) as jest.Mocked<ArticleService>;
                articleService.getVersionPairs.mockReturnValue(
                    of({
                        ...mockVersionPairs,
                        previous: {
                            ...mockVersionPairs.previous,
                            content: 'old\nunchanged1\nunchanged2\nunchanged3\nunchanged4\n',
                        },
                        current: {
                            ...mockVersionPairs.current,
                            content: 'new\nunchanged1\nunchanged2\nunchanged3\nunchanged4\n',
                        },
                    }),
                );
                spectator.component.data.loadFromRoute();
                spectator.detectChanges();

                expect(spectator.component.diffHtml()).toContain('Строк без изменений: 4');
            });

            it('should NOT collapse a single unchanged line', () => {
                const articleService = spectator.inject(ArticleService) as jest.Mocked<ArticleService>;
                articleService.getVersionPairs.mockReturnValue(
                    of({
                        ...mockVersionPairs,
                        previous: { ...mockVersionPairs.previous, content: 'old1\nunchanged\nold2\n' },
                        current: { ...mockVersionPairs.current, content: 'new1\nunchanged\nnew2\n' },
                    }),
                );
                spectator.component.data.loadFromRoute();
                spectator.detectChanges();

                expect(spectator.component.diffHtml()).not.toContain('diff-collapsed-lines');
            });

            it('should show changed lines with insert and delete spans', () => {
                const articleService = spectator.inject(ArticleService) as jest.Mocked<ArticleService>;
                articleService.getVersionPairs.mockReturnValue(
                    of({
                        ...mockVersionPairs,
                        previous: { ...mockVersionPairs.previous, content: 'old\nunchanged1\nunchanged2\n' },
                        current: { ...mockVersionPairs.current, content: 'new\nunchanged1\nunchanged2\n' },
                    }),
                );
                spectator.component.data.loadFromRoute();
                spectator.detectChanges();

                const html = spectator.component.diffHtml();
                expect(html).toContain('diff-delete');
                expect(html).toContain('diff-insert');
            });

            it('should not create highlighted spans for whitespace-only changes', () => {
                const articleService = spectator.inject(ArticleService) as jest.Mocked<ArticleService>;
                articleService.getVersionPairs.mockReturnValue(
                    of({
                        ...mockVersionPairs,
                        previous: { ...mockVersionPairs.previous, content: 'text\n   \n' },
                        current: { ...mockVersionPairs.current, content: 'text\n\t\n' },
                    }),
                );
                spectator.component.data.loadFromRoute();
                spectator.detectChanges();

                const html = spectator.component.diffHtml();
                expect(html).not.toMatch(/<span class="diff-(insert|delete)">\s*<\/span>/);
            });
        });
    });

    describe('JsDiff settings', () => {
        beforeEach(() => {
            spectator.component.data.loadFromRoute();
            spectator.detectChanges();
        });

        it('should show settings button for JsDiff engine', () => {
            const jsDiffEngine = DIFF_ENGINES.find(e => e.id === 'js-diff')!;
            spectator.component.onEngineChange(jsDiffEngine);
            spectator.detectChanges();

            expect(spectator.component.isJsDiff()).toBe(true);
            expect(spectator.query('[data-testid="jsdiff-settings-anchor"]')).toBeTruthy();
        });

        it('should toggle settings popover', () => {
            const jsDiffEngine = DIFF_ENGINES.find(e => e.id === 'js-diff')!;
            spectator.component.onEngineChange(jsDiffEngine);
            spectator.detectChanges();

            expect(spectator.component.settingsOpen()).toBe(false);
            expect(spectator.query('[data-testid="jsdiff-settings-popover"]')).toBeFalsy();

            spectator.component.toggleSettings();
            spectator.detectChanges();

            expect(spectator.component.settingsOpen()).toBe(true);
            expect(spectator.query('[data-testid="jsdiff-settings-popover"]')).toBeTruthy();
        });

        it('should close settings on backdrop click', () => {
            const jsDiffEngine = DIFF_ENGINES.find(e => e.id === 'js-diff')!;
            spectator.component.onEngineChange(jsDiffEngine);
            spectator.component.toggleSettings();
            spectator.detectChanges();

            spectator.component.closeSettings();
            spectator.detectChanges();

            expect(spectator.component.settingsOpen()).toBe(false);
            expect(spectator.query('[data-testid="jsdiff-settings-popover"]')).toBeFalsy();
        });

        it('should close settings on Escape key', () => {
            const jsDiffEngine = DIFF_ENGINES.find(e => e.id === 'js-diff')!;
            spectator.component.onEngineChange(jsDiffEngine);
            spectator.component.toggleSettings();
            spectator.detectChanges();

            spectator.dispatchKeyboardEvent(document, 'keydown', 'Escape');
            spectator.detectChanges();

            expect(spectator.component.settingsOpen()).toBe(false);
            expect(spectator.query('[data-testid="jsdiff-settings-popover"]')).toBeFalsy();
        });

        it('should not close settings on Escape when already closed', () => {
            spectator.component.onEscapePress();
            expect(spectator.component.settingsOpen()).toBe(false);
        });

        it('should extract checked from checkbox event', () => {
            const event = {
                target: { checked: true },
            } as unknown as Event;
            spectator.component.onCheckboxChange('ignoreCase', event);
            expect(spectator.component.jsDiffOptions().ignoreCase).toBe(true);
        });

        it('should update granularity', () => {
            spectator.component.onGranularityChange('lines');
            expect(spectator.component.jsDiffOptions().granularity).toBe('lines');
        });

        it('should update boolean options', () => {
            spectator.component.onOptionChange('ignoreCase', true);
            expect(spectator.component.jsDiffOptions().ignoreCase).toBe(true);
        });

        it('should preserve JsDiff settings when switching engines', () => {
            const jsDiffEngine = DIFF_ENGINES.find(e => e.id === 'js-diff')!;
            const dmpEngine = DIFF_ENGINES.find(e => e.id === 'diff-match-patch')!;

            spectator.component.onEngineChange(jsDiffEngine);
            spectator.component.onGranularityChange('lines');
            spectator.component.onOptionChange('ignoreWhitespace', true);

            spectator.component.onEngineChange(dmpEngine);
            spectator.component.onEngineChange(jsDiffEngine);

            expect(spectator.component.jsDiffOptions().granularity).toBe('lines');
            expect(spectator.component.jsDiffOptions().ignoreWhitespace).toBe(true);
        });

        it('should compute availability based on granularity', () => {
            spectator.component.onGranularityChange('words');
            expect(spectator.component.isIgnoreCaseAvailable()).toBe(true);
            expect(spectator.component.isIntlSegmenterAvailable()).toBe(true);
            expect(spectator.component.isLineOptionsAvailable()).toBe(false);

            spectator.component.onGranularityChange('lines');
            expect(spectator.component.isIgnoreCaseAvailable()).toBe(false);
            expect(spectator.component.isIntlSegmenterAvailable()).toBe(false);
            expect(spectator.component.isLineOptionsAvailable()).toBe(true);

            spectator.component.onGranularityChange('sentences');
            expect(spectator.component.isIgnoreCaseAvailable()).toBe(false);
            expect(spectator.component.isIntlSegmenterAvailable()).toBe(false);
            expect(spectator.component.isLineOptionsAvailable()).toBe(false);
        });
    });
});
