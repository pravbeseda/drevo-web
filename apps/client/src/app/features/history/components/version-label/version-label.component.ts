import { versionUrl } from '../../../../shared/helpers/page-kind';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageKind, VersionForDiff } from '@drevo-web/shared';
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
    readonly kind = input<PageKind>('articles');

    readonly link = computed(() => versionUrl(this.kind(), this.version().articleId, this.version().versionId));
}
