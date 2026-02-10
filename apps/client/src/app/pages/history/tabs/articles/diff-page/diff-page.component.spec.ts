import { ArticleService } from '../../../../../services/articles/article.service';
import { DiffPageComponent } from './diff-page.component';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { NEVER, of } from 'rxjs';
import { WINDOW } from '@drevo-web/core';
import { VersionPairs } from '@drevo-web/shared';

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
            {
                provide: WINDOW,
                useValue: { history: { back: jest.fn() } },
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
});
