import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { LoggerService, StorageService } from '@drevo-web/core';
import { mockLoggerProvider, MockLoggerService } from '@drevo-web/core/testing';
import { VersionPairs } from '@drevo-web/shared';
import { createComponentFactory, mockProvider, Spectator } from '@ngneat/spectator/jest';
import { of } from 'rxjs';
import { ArticleService } from '../../../../services/articles/article.service';
import { DiffPageDataService } from '../../services/diff-page-data.service';
import { DiffPageComponent } from './diff-page.component';

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
    let storageService: jest.Mocked<StorageService>;

    const createComponent = createComponentFactory({
        component: DiffPageComponent,
        mocks: [ArticleService],
        providers: [
            mockLoggerProvider(),
            mockProvider(StorageService),
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
        storageService = spectator.inject(StorageService) as jest.Mocked<StorageService>;
        const articleService = spectator.inject(ArticleService) as jest.Mocked<ArticleService>;
        articleService.getVersionPairs.mockReturnValue(of(mockVersionPairs));
    });

    it('should create', () => {
        spectator.detectChanges();
        expect(spectator.component).toBeTruthy();
    });

    it('should default to cm when no stored preference', () => {
        storageService.getString.mockReturnValue(undefined);
        spectator.detectChanges();
        expect(spectator.component.diffType()).toBe('cm');
    });

    it('should read stored preference on init', () => {
        storageService.getString.mockReturnValue('jsdiff');
        const s = createComponent();
        s.detectChanges();
        expect(s.component.diffType()).toBe('jsdiff');
    });

    it('should fallback to cm for invalid stored value', () => {
        storageService.getString.mockReturnValue('invalid');
        const s = createComponent();
        s.detectChanges();
        expect(s.component.diffType()).toBe('cm');
    });

    it('should toggle from cm to jsdiff', () => {
        spectator.detectChanges();
        spectator.component.toggleDiffType();
        expect(spectator.component.diffType()).toBe('jsdiff');
    });

    it('should toggle from jsdiff back to cm', () => {
        spectator.detectChanges();
        spectator.component.toggleDiffType();
        spectator.component.toggleDiffType();
        expect(spectator.component.diffType()).toBe('cm');
    });

    it('should save preference to storage on toggle', () => {
        spectator.detectChanges();
        spectator.component.toggleDiffType();
        expect(storageService.setString).toHaveBeenCalledWith('diff-view-type', 'jsdiff');
    });

    it('should log diff type change', () => {
        spectator.detectChanges();
        spectator.component.toggleDiffType();
        const loggerService = spectator.inject(LoggerService) as unknown as MockLoggerService;
        expect(loggerService.mockLogger.info).toHaveBeenCalledWith('Diff view type changed', { type: 'jsdiff' });
    });

    it('should call data.loadFromRoute on init', () => {
        spectator.detectChanges();
        const data = spectator.inject(DiffPageDataService, true);
        expect(data.loadFromRoute).toBeTruthy();
    });
});
