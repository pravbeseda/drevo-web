import { SidebarActionComponent } from '../../../../shared/components/sidebar-action/sidebar-action.component';
import { DiffPageDataService } from '../../services/diff-page-data.service';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { LoggerService } from '@drevo-web/core';
import { DIFF_ENGINES, DiffChange, DiffEngineEntry, escapeHtml } from '@drevo-web/shared';

@Component({
    selector: 'app-diff-view',
    imports: [SidebarActionComponent],
    templateUrl: './diff-view.component.html',
    styleUrl: './diff-view.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiffViewComponent {
    readonly data = inject(DiffPageDataService);

    private readonly logger = inject(LoggerService).withContext('DiffViewComponent');

    private readonly _selectedEngine = signal<DiffEngineEntry>(DIFF_ENGINES[0]);
    private readonly _collapsed = signal(true);

    readonly selectedEngine = this._selectedEngine.asReadonly();
    readonly engines = DIFF_ENGINES;
    readonly collapsed = this._collapsed.asReadonly();

    readonly diffHtml = computed(() => {
        const pairs = this.data.versionPairs();
        const engine = this._selectedEngine();
        if (!pairs) return '';

        const changes = engine.engine.computeDiff(pairs.previous.content, pairs.current.content);
        return this._collapsed() ? this.renderCollapsedDiffHtml(changes) : this.renderDiffHtml(changes);
    });

    toggleEngine(): void {
        const currentIndex = this.engines.indexOf(this._selectedEngine());
        const nextIndex = (currentIndex + 1) % this.engines.length;
        this._selectedEngine.set(this.engines[nextIndex]);
        this.logger.info('Diff engine changed', { engineId: this._selectedEngine().id });
    }

    toggleCollapsed(): void {
        this._collapsed.update(v => !v);
        this.logger.info('Collapsed mode changed', { collapsed: this._collapsed() });
    }

    private renderDiffHtml(changes: DiffChange[]): string {
        return changes
            .map(change => {
                const escaped = escapeHtml(change.text);
                switch (change.type) {
                    case 'insert':
                        return `<span class="diff-insert">${escaped}</span>`;
                    case 'delete':
                        return `<span class="diff-delete">${escaped}</span>`;
                    default:
                        return escaped;
                }
            })
            .join('');
    }

    private renderCollapsedDiffHtml(changes: DiffChange[]): string {
        const lines = this.splitChangesIntoLines(changes);
        const isChanged = lines.map(line => line.some(c => c.type !== 'equal'));
        let result = '';
        let needsNewline = false;
        let i = 0;

        while (i < lines.length) {
            if (isChanged[i]) {
                if (needsNewline) result += '\n';
                result += this.renderDiffHtml(lines[i]);
                needsNewline = true;
                i++;
            } else {
                let j = i;
                while (j < lines.length && !isChanged[j]) j++;
                if (j - i === 1) {
                    if (needsNewline) result += '\n';
                    result += this.renderDiffHtml(lines[i]);
                    needsNewline = true;
                } else {
                    result += `<div class="diff-collapsed-lines">Строк без изменений: ${j - i}</div>`;
                    needsNewline = false;
                }
                i = j;
            }
        }

        return result;
    }

    private splitChangesIntoLines(changes: DiffChange[]): DiffChange[][] {
        const lines: DiffChange[][] = [[]];
        for (const change of changes) {
            const parts = change.text.split('\n');
            for (let i = 0; i < parts.length; i++) {
                if (i > 0) lines.push([]);
                const text = parts[i].replace(/\r/g, '');
                if (text) {
                    lines[lines.length - 1].push({ type: change.type, text });
                }
            }
        }
        while (lines.length > 0 && lines[lines.length - 1].length === 0) {
            lines.pop();
        }

        return lines.map(line => {
            if (line.some(c => c.text.trim())) return line;
            return line.map(c => ({ type: 'equal' as const, text: c.text }));
        });
    }
}
