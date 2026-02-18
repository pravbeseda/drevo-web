import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';
import { VersionService } from '../services/version.service';
import { VersionDisplayComponent } from './version-display.component';

describe('VersionDisplayComponent', () => {
    let spectator: Spectator<VersionDisplayComponent>;
    const versionServiceMock = {
        getVersion: jest.fn().mockReturnValue('test-version'),
    } satisfies Pick<VersionService, 'getVersion'>;

    const createComponent = createComponentFactory({
        component: VersionDisplayComponent,
        providers: [{ provide: VersionService, useValue: versionServiceMock }],
    });

    beforeEach(() => {
        versionServiceMock.getVersion.mockClear();
    });

    it('should create', () => {
        spectator = createComponent();

        expect(spectator.component).toBeTruthy();
    });

    it('should display version from VersionService', () => {
        spectator = createComponent();

        const versionElement = spectator.query('[data-testid="app-version"]');

        expect(versionServiceMock.getVersion).toHaveBeenCalledTimes(1);
        expect(versionElement?.textContent).toContain('test-version');
    });
});
