import { ArticleService } from '../../../../../services/articles/article.service';
import { DiffPageComponent } from './diff-page.component';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { NEVER, of } from 'rxjs';
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

describe('DiffPageComponent', () => {
    let spectator: Spectator<DiffPageComponent>;
    let articleService: jest.Mocked<ArticleService>;

    const createComponent = createComponentFactory({
        component: DiffPageComponent,
        mocks: [ArticleService],
        providers: [
            mockLoggerProvider(),
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
        articleService = spectator.inject(
            ArticleService
        ) as jest.Mocked<ArticleService>;
    });

    it('should create', () => {
        articleService.getVersionPairs.mockReturnValue(of(mockVersionPairs));
        spectator.detectChanges();
        expect(spectator.component).toBeTruthy();
    });

    it('should show spinner while loading', () => {
        articleService.getVersionPairs.mockReturnValue(NEVER);
        spectator.detectChanges();
        expect(spectator.query('ui-spinner')).toBeTruthy();
    });

    it('should load version pairs on init', () => {
        articleService.getVersionPairs.mockReturnValue(of(mockVersionPairs));
        spectator.detectChanges();
        expect(articleService.getVersionPairs).toHaveBeenCalledWith(200);
    });

    it('should display version info after loading', () => {
        articleService.getVersionPairs.mockReturnValue(of(mockVersionPairs));
        spectator.detectChanges();

        expect(spectator.component.isLoading()).toBe(false);
        expect(spectator.component.versionInfo()).toBeTruthy();
        expect(spectator.component.versionInfo()?.title).toBe('Test Article');
    });

    describe('JsDiff settings', () => {
        beforeEach(() => {
            articleService.getVersionPairs.mockReturnValue(
                of(mockVersionPairs)
            );
            spectator.detectChanges();
        });

        it('should not show settings button for DMP engine', () => {
            expect(spectator.component.isJsDiff()).toBe(false);
            expect(spectator.query('.settings-anchor')).toBeFalsy();
        });

        it('should show settings button for JsDiff engine', () => {
            const jsDiffEngine = DIFF_ENGINES.find(e => e.id === 'js-diff')!;
            spectator.component.onEngineChange(jsDiffEngine);
            spectator.detectChanges();

            expect(spectator.component.isJsDiff()).toBe(true);
            expect(spectator.query('.settings-anchor')).toBeTruthy();
        });

        it('should toggle settings popover', () => {
            const jsDiffEngine = DIFF_ENGINES.find(e => e.id === 'js-diff')!;
            spectator.component.onEngineChange(jsDiffEngine);
            spectator.detectChanges();

            expect(spectator.component.settingsOpen()).toBe(false);
            expect(spectator.query('.settings-popover')).toBeFalsy();

            spectator.component.toggleSettings();
            spectator.detectChanges();

            expect(spectator.component.settingsOpen()).toBe(true);
            expect(spectator.query('.settings-popover')).toBeTruthy();
        });

        it('should close settings on backdrop click', () => {
            const jsDiffEngine = DIFF_ENGINES.find(e => e.id === 'js-diff')!;
            spectator.component.onEngineChange(jsDiffEngine);
            spectator.component.toggleSettings();
            spectator.detectChanges();

            spectator.component.closeSettings();
            spectator.detectChanges();

            expect(spectator.component.settingsOpen()).toBe(false);
            expect(spectator.query('.settings-popover')).toBeFalsy();
        });

        it('should close settings on Escape key', () => {
            const jsDiffEngine = DIFF_ENGINES.find(e => e.id === 'js-diff')!;
            spectator.component.onEngineChange(jsDiffEngine);
            spectator.component.toggleSettings();
            spectator.detectChanges();

            spectator.dispatchKeyboardEvent(document, 'keydown', 'Escape');
            spectator.detectChanges();

            expect(spectator.component.settingsOpen()).toBe(false);
            expect(spectator.query('.settings-popover')).toBeFalsy();
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
            expect(spectator.component.jsDiffOptions().granularity).toBe(
                'lines'
            );
        });

        it('should update boolean options', () => {
            spectator.component.onOptionChange('ignoreCase', true);
            expect(spectator.component.jsDiffOptions().ignoreCase).toBe(true);
        });

        it('should preserve JsDiff settings when switching engines', () => {
            const jsDiffEngine = DIFF_ENGINES.find(e => e.id === 'js-diff')!;
            const dmpEngine = DIFF_ENGINES.find(
                e => e.id === 'diff-match-patch'
            )!;

            spectator.component.onEngineChange(jsDiffEngine);
            spectator.component.onGranularityChange('lines');
            spectator.component.onOptionChange('ignoreWhitespace', true);

            spectator.component.onEngineChange(dmpEngine);
            spectator.component.onEngineChange(jsDiffEngine);

            expect(spectator.component.jsDiffOptions().granularity).toBe(
                'lines'
            );
            expect(spectator.component.jsDiffOptions().ignoreWhitespace).toBe(
                true
            );
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
