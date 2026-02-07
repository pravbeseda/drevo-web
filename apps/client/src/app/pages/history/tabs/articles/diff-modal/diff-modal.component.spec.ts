import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { DiffModalComponent, DiffModalData } from './diff-modal.component';
import { ArticleService } from '../../../../../services/articles/article.service';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { MODAL_DATA, ModalData } from '@drevo-web/ui';
import { VersionPairs } from '@drevo-web/shared';
import { of, throwError } from 'rxjs';

const MOCK_VERSION_PAIRS: VersionPairs = {
    current: {
        versionId: 10,
        content: 'Hello world updated',
        author: 'Author A',
        date: new Date('2025-03-10T12:00:00Z'),
        title: 'Test Article',
        info: 'Updated intro',
    },
    previous: {
        versionId: 9,
        content: 'Hello world',
        author: 'Author B',
        date: new Date('2025-03-09T10:00:00Z'),
        title: 'Test Article',
        info: '',
    },
};

function createMockModalData(): ModalData<DiffModalData> {
    return {
        data: { versionId: 10 },
        close: jest.fn(),
    };
}

describe('DiffModalComponent', () => {
    let spectator: Spectator<DiffModalComponent>;
    let articleService: jest.Mocked<ArticleService>;
    let modalData: ModalData<DiffModalData>;

    const createComponent = createComponentFactory({
        component: DiffModalComponent,
        detectChanges: false,
        mocks: [ArticleService],
        providers: [
            mockLoggerProvider(),
            {
                provide: MODAL_DATA,
                useFactory: () => createMockModalData(),
            },
        ],
    });

    beforeEach(() => {
        spectator = createComponent();
        articleService = spectator.inject(
            ArticleService
        ) as jest.Mocked<ArticleService>;
        modalData = spectator.inject(MODAL_DATA) as ModalData<DiffModalData>;
    });

    it('should create', () => {
        articleService.getVersionPairs.mockReturnValue(of(MOCK_VERSION_PAIRS));
        spectator.detectChanges();
        expect(spectator.component).toBeTruthy();
    });

    it('should show spinner while loading', () => {
        expect(spectator.component.isLoading()).toBe(true);
    });

    it('should load version pairs on init', () => {
        articleService.getVersionPairs.mockReturnValue(of(MOCK_VERSION_PAIRS));
        spectator.detectChanges();

        expect(articleService.getVersionPairs).toHaveBeenCalledWith(10);
        expect(spectator.component.isLoading()).toBe(false);
        expect(spectator.component.versionPairs()).toEqual(MOCK_VERSION_PAIRS);
    });

    it('should show error when loading fails', () => {
        articleService.getVersionPairs.mockReturnValue(
            throwError(() => ({ error: { errorCode: 'UNKNOWN' } }))
        );
        spectator.detectChanges();

        expect(spectator.component.isLoading()).toBe(false);
        expect(spectator.component.error()).toBe('Ошибка загрузки данных');
    });

    it('should show specific error for no previous version', () => {
        articleService.getVersionPairs.mockReturnValue(
            throwError(() => ({
                error: { errorCode: 'NO_PREVIOUS_VERSION' },
            }))
        );
        spectator.detectChanges();

        expect(spectator.component.error()).toBe(
            'Предыдущая версия не найдена'
        );
    });

    it('should generate diff HTML after loading', () => {
        articleService.getVersionPairs.mockReturnValue(of(MOCK_VERSION_PAIRS));
        spectator.detectChanges();

        const html = spectator.component.diffHtml();
        expect(html).toBeTruthy();
        expect(html.length).toBeGreaterThan(0);
    });

    it('should change engine when onEngineChange is called', () => {
        articleService.getVersionPairs.mockReturnValue(of(MOCK_VERSION_PAIRS));
        spectator.detectChanges();

        const engines = spectator.component.engines;
        const secondEngine = engines[1];
        spectator.component.onEngineChange(secondEngine);

        expect(spectator.component.selectedEngine()).toBe(secondEngine);
    });

    it('should close modal when onClose is called', () => {
        spectator.component.onClose();
        expect(modalData.close).toHaveBeenCalled();
    });

    it('should provide version info after loading', () => {
        articleService.getVersionPairs.mockReturnValue(of(MOCK_VERSION_PAIRS));
        spectator.detectChanges();

        const info = spectator.component.versionInfo();
        expect(info).toBeDefined();
        expect(info!.title).toBe('Test Article');
        expect(info!.current.versionId).toBe(10);
        expect(info!.previous.versionId).toBe(9);
    });
});
