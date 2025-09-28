import { ChangeDetectionStrategy, Component } from '@angular/core';
import { VersionService } from '../../services/version/version.service';

@Component({
    selector: 'app-main',
    imports: [],
    templateUrl: './main.component.html',
    styleUrl: './main.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainComponent {
    readonly version: string;

    constructor(private readonly versionService: VersionService) {
        this.version = this.versionService.getVersion();
    }
}
