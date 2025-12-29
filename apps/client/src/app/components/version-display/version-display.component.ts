import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { VersionService } from '../../services/version/version.service';

@Component({
    selector: 'app-version-display',
    imports: [],
    templateUrl: './version-display.component.html',
    styleUrl: './version-display.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VersionDisplayComponent {
    private readonly versionService = inject(VersionService);
    readonly version: string = this.versionService.getVersion();
}
