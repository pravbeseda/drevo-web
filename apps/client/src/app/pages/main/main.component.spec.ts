import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';

import { MainComponent } from './main.component';
import { VersionService } from '../../services/version/version.service';

describe('MainComponent', () => {
    let spectator: Spectator<MainComponent>;
    const versionServiceMock = {
        getVersion: jest.fn().mockReturnValue('test-version'),
    } satisfies Pick<VersionService, 'getVersion'>;

    const createComponent = createComponentFactory({
        component: MainComponent,
        providers: [{ provide: VersionService, useValue: versionServiceMock }],
    });

    beforeEach(() => {
        versionServiceMock.getVersion.mockClear();
    });

    it('should display version from VersionService', () => {
        spectator = createComponent();

        const versionElement = spectator.query('[data-testid="app-version"]');

        expect(versionServiceMock.getVersion).toHaveBeenCalledTimes(1);
        expect(versionElement?.textContent).toContain('test-version');
    });
});
