import { AuthService } from '../../../../services/auth/auth.service';
import { ArticleModerationPanelComponent } from '../../../../shared/components/article-moderation-panel/article-moderation-panel.component';
import { SidebarActionComponent } from '../../../../shared/components/sidebar-action/sidebar-action.component';
import { CmDiffViewComponent } from '../../components/cm-diff-view/cm-diff-view.component';
import { DiffViewComponent } from '../../components/diff-view/diff-view.component';
import { VersionLabelComponent } from '../../components/version-label/version-label.component';
import { DiffPageDataService } from '../../services/diff-page-data.service';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { LoggerService, StorageService } from '@drevo-web/core';
import { APPROVAL_CLASS, APPROVAL_ICONS, APPROVAL_TITLES, ApprovalStatus, ModerationResult } from '@drevo-web/shared';
import { SidePanelComponent } from '@drevo-web/ui';

type DiffViewType = 'cm' | 'jsdiff';

const STORAGE_KEY = 'diff-view-type';
const VALID_TYPES: readonly DiffViewType[] = ['cm', 'jsdiff'];

@Component({
    selector: 'app-diff-page',
    imports: [
        ArticleModerationPanelComponent,
        CmDiffViewComponent,
        DiffViewComponent,
        SidebarActionComponent,
        SidePanelComponent,
        VersionLabelComponent,
    ],
    templateUrl: './diff-page.component.html',
    styleUrl: './diff-page.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiffPageComponent {
    readonly data = inject(DiffPageDataService);

    private readonly authService = inject(AuthService);
    private readonly logger = inject(LoggerService).withContext('DiffPageComponent');
    private readonly storage = inject(StorageService);

    private readonly user = toSignal(this.authService.user$);
    readonly canModerate = computed(() => this.user()?.permissions.canModerate ?? false);

    readonly moderationIcon = computed(() => {
        const pairs = this.data.versionPairs();
        if (!pairs) return 'schedule';
        return APPROVAL_ICONS[APPROVAL_CLASS[pairs.current.approved]];
    });

    readonly moderationLabel = computed(() => {
        const pairs = this.data.versionPairs();
        if (!pairs) return '';
        return APPROVAL_TITLES[APPROVAL_CLASS[pairs.current.approved]];
    });

    readonly isModerationEnabled = computed(() => {
        const pairs = this.data.versionPairs();
        if (!pairs) return false;
        return pairs.previous.approved === ApprovalStatus.Approved;
    });

    private readonly _isModerationPanelOpen = signal(false);
    readonly isModerationPanelOpen = this._isModerationPanelOpen.asReadonly();

    private readonly _diffType = signal<DiffViewType>(this.loadDiffType());
    readonly diffType = this._diffType.asReadonly();

    toggleModerationPanel(): void {
        this._isModerationPanelOpen.update(open => !open);
    }

    closeModerationPanel(): void {
        this._isModerationPanelOpen.set(false);
    }

    onModerated(result: ModerationResult): void {
        this.data.updateCurrentApproval(result.approved, result.comment);
        this._isModerationPanelOpen.set(false);
        this.logger.info('Version moderated', { versionId: result.versionId, approved: result.approved });
    }

    toggleDiffType(): void {
        const newType: DiffViewType = this._diffType() === 'cm' ? 'jsdiff' : 'cm';
        this._diffType.set(newType);
        this.storage.setString(STORAGE_KEY, newType);
        this.logger.info('Diff view type changed', { type: newType });
    }

    private loadDiffType(): DiffViewType {
        const stored = this.storage.getString(STORAGE_KEY);
        return stored && VALID_TYPES.includes(stored as DiffViewType) ? (stored as DiffViewType) : 'cm';
    }
}
