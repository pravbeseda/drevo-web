import { ModerationSidebarActionComponent } from '../../../../shared/components/moderation-sidebar-action/moderation-sidebar-action.component';
import { SidebarActionComponent } from '../../../../shared/components/sidebar-action/sidebar-action.component';
import { CmDiffViewComponent } from '../../components/cm-diff-view/cm-diff-view.component';
import { DiffViewComponent } from '../../components/diff-view/diff-view.component';
import { VersionLabelComponent } from '../../components/version-label/version-label.component';
import { DiffPageDataService } from '../../services/diff-page-data.service';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { LoggerService, StorageService } from '@drevo-web/core';
import { ApprovalStatus, ModerationResult } from '@drevo-web/shared';

type DiffViewType = 'cm' | 'jsdiff';

const STORAGE_KEY = 'diff-view-type';
const VALID_TYPES: readonly DiffViewType[] = ['cm', 'jsdiff'];

@Component({
    selector: 'app-diff-page',
    imports: [
        CmDiffViewComponent,
        DiffViewComponent,
        ModerationSidebarActionComponent,
        SidebarActionComponent,
        VersionLabelComponent,
    ],
    templateUrl: './diff-page.component.html',
    styleUrl: './diff-page.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiffPageComponent {
    readonly data = inject(DiffPageDataService);

    private readonly logger = inject(LoggerService).withContext('DiffPageComponent');
    private readonly storage = inject(StorageService);

    readonly isModerationEnabled = computed(() => {
        const pairs = this.data.versionPairs();
        if (!pairs) return false;
        return pairs.previous.approved === ApprovalStatus.Approved;
    });

    private readonly _diffType = signal<DiffViewType>(this.loadDiffType());
    readonly diffType = this._diffType.asReadonly();

    onModerated(result: ModerationResult): void {
        this.data.updateCurrentApproval(result.approved, result.comment);
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
