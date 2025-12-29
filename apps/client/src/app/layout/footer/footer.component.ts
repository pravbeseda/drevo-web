import { ChangeDetectionStrategy, Component } from '@angular/core';
import { VersionDisplayComponent } from '../../components/version-display/version-display.component';

@Component({
    selector: 'app-footer',
    imports: [VersionDisplayComponent],
    templateUrl: './footer.component.html',
    styleUrl: './footer.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {}
