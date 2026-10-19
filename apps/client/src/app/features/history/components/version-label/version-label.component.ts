import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { VersionForDiff } from '@drevo-web/shared';
import { FormatDatePipe } from '@drevo-web/ui/format-date';
import { StatusIconComponent } from '@drevo-web/ui/status-icon';

@Component({
    selector: 'app-version-label',
    imports: [FormatDatePipe, RouterLink, StatusIconComponent],
    templateUrl: './version-label.component.html',
    styleUrl: './version-label.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VersionLabelComponent {
    readonly version = input.required<VersionForDiff>();
}
