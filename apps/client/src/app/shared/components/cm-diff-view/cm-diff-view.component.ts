import { CmDiffEditorComponent, CmDiffMode } from '../cm-diff-editor/cm-diff-editor.component';
import { SidebarActionComponent } from '../sidebar-action/sidebar-action.component';
import { ChangeDetectionStrategy, Component, inject, input, signal, viewChild } from '@angular/core';
import { LoggerService } from '@drevo-web/core';

/** The diff page's diff: the CodeMirror view plus its controls in the page sidebar. */
@Component({
    selector: 'app-cm-diff-view',
    imports: [CmDiffEditorComponent, SidebarActionComponent],
    templateUrl: './cm-diff-view.component.html',
    styleUrl: './cm-diff-view.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '[class.auto-height]': 'autoHeight()',
    },
})
export class CmDiffViewComponent {
    readonly oldText = input.required<string>();
    readonly newText = input.required<string>();
    /** See `CmDiffEditorComponent.autoHeight`. */
    readonly autoHeight = input(false);

    private readonly logger = inject(LoggerService).withContext('CmDiffViewComponent');
    private readonly editor = viewChild(CmDiffEditorComponent);

    private readonly _viewMode = signal<CmDiffMode>('unified');
    readonly viewMode = this._viewMode.asReadonly();

    toggleViewMode(): void {
        const newMode: CmDiffMode = this._viewMode() === 'unified' ? 'side-by-side' : 'unified';
        this._viewMode.set(newMode);
        this.logger.info('View mode changed', { mode: newMode });
    }

    goToNext(): void {
        this.editor()?.goToNext();
    }

    goToPrevious(): void {
        this.editor()?.goToPrevious();
    }
}
