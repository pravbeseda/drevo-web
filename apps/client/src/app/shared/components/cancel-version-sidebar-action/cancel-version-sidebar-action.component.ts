import { CancelVersionService } from '../../../services/articles/cancel-version.service';
import { AuthService } from '../../../services/auth/auth.service';
import { VersionForModeration } from '../../models/version-for-moderation.model';
import { SidebarActionComponent } from '../sidebar-action/sidebar-action.component';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, output } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ApprovalStatus, CancelVersionResult, SidebarActionPriority } from '@drevo-web/shared';

@Component({
    selector: 'app-cancel-version-sidebar-action',
    imports: [SidebarActionComponent],
    templateUrl: './cancel-version-sidebar-action.component.html',
    styleUrl: './cancel-version-sidebar-action.component.scss',
    providers: [CancelVersionService],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CancelVersionSidebarActionComponent {
    readonly version = input.required<VersionForModeration>();
    readonly priority = input<SidebarActionPriority>('secondary');

    readonly cancelled = output<CancelVersionResult>();

    private readonly authService = inject(AuthService);
    private readonly cancelVersionService = inject(CancelVersionService);
    private readonly destroyRef = inject(DestroyRef);

    private readonly user = toSignal(this.authService.user$);

    readonly canCancel = computed(() => {
        const user = this.user();
        const version = this.version();
        return !!user && version.author === user.name && version.approved === ApprovalStatus.Pending;
    });

    onActivated(): void {
        this.cancelVersionService
            .cancelVersion(this.version().versionId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(result => this.cancelled.emit(result));
    }
}
