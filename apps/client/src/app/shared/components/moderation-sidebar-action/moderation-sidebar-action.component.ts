import { AuthService } from '../../../services/auth/auth.service';
import { VersionForModeration } from '../../models/version-for-moderation.model';
import { openModerationSheet } from '../moderation-sheet/open-moderation-sheet';
import { SidebarActionComponent } from '../sidebar-action/sidebar-action.component';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, output } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ValidationResult } from '@drevo-web/editor';
import {
    APPROVAL_CLASS,
    APPROVAL_ICONS,
    ApprovalStatus,
    ModerationResult,
    SidebarActionPriority,
} from '@drevo-web/shared';
import { ModalService } from '@drevo-web/ui/modal';

@Component({
    selector: 'app-moderation-sidebar-action',
    imports: [SidebarActionComponent],
    templateUrl: './moderation-sidebar-action.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModerationSidebarActionComponent {
    readonly version = input.required<VersionForModeration>();
    readonly disabled = input(false);
    readonly priority = input<SidebarActionPriority>('secondary');
    readonly validationResult = input<ValidationResult>({ errors: 0, warnings: 0 });

    readonly validationCount = computed(() => {
        const result = this.validationResult();
        return result.errors + result.warnings;
    });

    readonly moderated = output<ModerationResult>();

    private readonly authService = inject(AuthService);
    private readonly user = toSignal(this.authService.user$);
    readonly canModerate = computed(
        () => (this.user()?.permissions.canModerate ?? false) && this.version().approved !== ApprovalStatus.Cancelled,
    );

    private readonly approvalClass = computed(() => APPROVAL_CLASS[this.version().approved]);
    readonly moderationIcon = computed(() => APPROVAL_ICONS[this.approvalClass()]);

    private readonly modalService = inject(ModalService);
    private readonly destroyRef = inject(DestroyRef);

    openSheet(): void {
        openModerationSheet(this.modalService, this.version())
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(result => {
                if (result) this.moderated.emit(result);
            });
    }
}
