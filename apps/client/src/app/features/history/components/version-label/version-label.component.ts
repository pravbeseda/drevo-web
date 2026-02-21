import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { VersionForDiff } from '@drevo-web/shared';
import { FormatDatePipe } from '@drevo-web/ui';

@Component({
    selector: 'app-version-label',
    imports: [FormatDatePipe, RouterLink],
    templateUrl: './version-label.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VersionLabelComponent {
    readonly version = input.required<VersionForDiff>();
}
