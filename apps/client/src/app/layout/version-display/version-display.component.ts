import { VersionService } from '../services/version.service';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

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
