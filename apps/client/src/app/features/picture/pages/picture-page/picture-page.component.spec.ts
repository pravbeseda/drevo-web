import { PictureLightboxService } from '../../../../services/pictures/picture-lightbox.service';
import { PictureStateService } from '../../services/picture-state.service';
import { PicturePageComponent } from './picture-page.component';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { createComponentFactory, mockProvider, Spectator } from '@ngneat/spectator/jest';

describe('PicturesPageComponent', () => {
    let spectator: Spectator<PicturePageComponent>;

    const mockState = {
        init: jest.fn(),
        onSearchChange: jest.fn(),
        onContainerResize: jest.fn(),
        loadMore: jest.fn(),
        isLoading: jest.fn(),
        isLoadingMore: jest.fn(),
        rows: jest.fn(),
        totalRows: jest.fn(),
        hasResults: jest.fn(),
        showNoResults: jest.fn(),
        trackByFn: jest.fn((_index: number) => ''),
    };

    const resetMockDefaults = (): void => {
        mockState.isLoading.mockReturnValue(false);
        mockState.isLoadingMore.mockReturnValue(false);
        mockState.rows.mockReturnValue([]);
        mockState.totalRows.mockReturnValue(0);
        mockState.hasResults.mockReturnValue(false);
        mockState.showNoResults.mockReturnValue(false);
    };

    const createComponent = createComponentFactory({
        component: PicturePageComponent,
        componentProviders: [{ provide: PictureStateService, useValue: mockState }],
        providers: [mockLoggerProvider(), mockProvider(PictureLightboxService)],
        detectChanges: false,
    });

    beforeEach(() => {
        jest.clearAllMocks();
        resetMockDefaults();
        spectator = createComponent();
    });

    it('should create', () => {
        expect(spectator.component).toBeTruthy();
    });

    it('should call state.init on ngOnInit', () => {
        spectator.detectChanges();
        expect(mockState.init).toHaveBeenCalled();
    });

    it('should delegate search to state service', () => {
        spectator.detectChanges();
        spectator.component.onSearchChange('храм');
        expect(mockState.onSearchChange).toHaveBeenCalledWith('храм');
    });

    it('should delegate loadMore to state service', () => {
        spectator.detectChanges();
        spectator.component.onLoadMore();
        expect(mockState.loadMore).toHaveBeenCalled();
    });

    it('should show spinner when loading', () => {
        mockState.isLoading.mockReturnValue(true);
        spectator.detectChanges();
        expect(spectator.query('ui-spinner')).toBeTruthy();
    });

    it('should show no results message', () => {
        mockState.showNoResults.mockReturnValue(true);
        spectator.detectChanges();
        expect(spectator.query('.pictures-page__empty')).toBeTruthy();
    });

    it('should not be in select mode by default', () => {
        spectator.detectChanges();
        expect(spectator.component.isSelectMode).toBe(false);
    });
});
