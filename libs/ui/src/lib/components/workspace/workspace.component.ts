import { WorkspaceTabComponent } from './workspace-tab.component';
import { IconComponent } from '../icon/icon.component';
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, contentChildren, output, signal } from '@angular/core';

@Component({
    selector: 'ui-workspace',
    imports: [IconComponent, NgTemplateOutlet],
    templateUrl: './workspace.component.html',
    styleUrl: './workspace.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceComponent {
    readonly tabs = contentChildren(WorkspaceTabComponent);
    readonly activeTabChange = output<number>();

    private readonly _activeIndex = signal(0);
    readonly activeIndex = this._activeIndex.asReadonly();

    private readonly _activatedIndices = signal(new Set<number>([0]));

    isTabVisible(index: number): boolean {
        return this._activeIndex() === index;
    }

    shouldRenderKeepAlive(index: number): boolean {
        return this._activatedIndices().has(index);
    }

    selectTab(index: number): void {
        if (index === this._activeIndex()) {
            return;
        }

        this._activeIndex.set(index);

        this._activatedIndices.update(set => {
            const next = new Set(set);
            next.add(index);
            return next;
        });

        this.activeTabChange.emit(index);
    }
}
