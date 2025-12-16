import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { VersionService } from '../../services/version/version.service';

@Component({
    selector: 'app-main',
    imports: [],
    templateUrl: './main.component.html',
    styleUrl: './main.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainComponent {
    private readonly versionService = inject(VersionService);
    readonly version: string = this.versionService.getVersion();
}
