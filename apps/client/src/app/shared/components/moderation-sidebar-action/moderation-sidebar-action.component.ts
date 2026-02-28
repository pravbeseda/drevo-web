import { AuthService } from '../../../services/auth/auth.service';
import { VersionForModeration } from '../../models/version-for-moderation.model';
import { ArticleModerationPanelComponent } from '../article-moderation-panel/article-moderation-panel.component';
import { SidebarActionComponent } from '../sidebar-action/sidebar-action.component';
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { APPROVAL_CLASS, APPROVAL_ICONS, APPROVAL_TITLES, ModerationResult } from '@drevo-web/shared';
import { SidePanelComponent } from '@drevo-web/ui';

@Component({
    selector: 'app-moderation-sidebar-action',
    imports: [ArticleModerationPanelComponent, SidebarActionComponent, SidePanelComponent],
    templateUrl: './moderation-sidebar-action.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModerationSidebarActionComponent {
    readonly version = input.required<VersionForModeration>();
    readonly disabled = input(false);

    readonly moderated = output<ModerationResult>();

    private readonly authService = inject(AuthService);
    private readonly user = toSignal(this.authService.user$);
    readonly canModerate = computed(() => this.user()?.permissions.canModerate ?? false);

    private readonly approvalClass = computed(() => APPROVAL_CLASS[this.version().approved]);
    readonly moderationIcon = computed(() => APPROVAL_ICONS[this.approvalClass()]);
    readonly moderationLabel = computed(() => 'Модерация: ' + APPROVAL_TITLES[this.approvalClass()]);

    private readonly _isPanelOpen = signal(false);
    readonly isPanelOpen = this._isPanelOpen.asReadonly();

    togglePanel(): void {
        this._isPanelOpen.update(v => !v);
    }

    closePanel(): void {
        this._isPanelOpen.set(false);
    }

    onModerated(result: ModerationResult): void {
        this._isPanelOpen.set(false);
        this.moderated.emit(result);
    }
}
