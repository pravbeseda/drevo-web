import { CmDiffViewComponent } from '../../components/cm-diff-view/cm-diff-view.component';
import { DiffViewComponent } from '../../components/diff-view/diff-view.component';
import { VersionLabelComponent } from '../../components/version-label/version-label.component';
import { DiffPageDataService } from '../../services/diff-page-data.service';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { LoggerService, StorageService } from '@drevo-web/core';
import { SidebarActionComponent } from '@drevo-web/ui';

type DiffViewType = 'cm' | 'jsdiff';

const STORAGE_KEY = 'diff-view-type';
const VALID_TYPES: readonly DiffViewType[] = ['cm', 'jsdiff'];

@Component({
    selector: 'app-diff-page',
    imports: [CmDiffViewComponent, DiffViewComponent, SidebarActionComponent, VersionLabelComponent],
    templateUrl: './diff-page.component.html',
    styleUrl: './diff-page.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiffPageComponent {
    readonly data = inject(DiffPageDataService);

    private readonly logger = inject(LoggerService).withContext('DiffPageComponent');
    private readonly storage = inject(StorageService);

    private readonly _diffType = signal<DiffViewType>(this.loadDiffType());
    readonly diffType = this._diffType.asReadonly();

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
