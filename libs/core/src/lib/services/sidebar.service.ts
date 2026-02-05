import { Injectable, signal, computed } from '@angular/core';
import { SidebarAction } from '@drevo-web/shared';

@Injectable({
    providedIn: 'root',
})
export class SidebarService {
    private readonly actionsMap = signal<Map<string, SidebarAction>>(new Map());

    readonly actions = computed(() => Array.from(this.actionsMap().values()));

    readonly primaryActions = computed(() =>
        this.actions().filter(action => action.priority === 'primary')
    );

    readonly secondaryActions = computed(() =>
        this.actions().filter(action => action.priority === 'secondary')
    );

    registerAction(action: SidebarAction): void {
        this.actionsMap.update(map => {
            const newMap = new Map(map);
            newMap.set(action.id, action);
            return newMap;
        });
    }

    unregisterAction(id: string): void {
        this.actionsMap.update(map => {
            const newMap = new Map(map);
            newMap.delete(id);
            return newMap;
        });
    }

    clear(): void {
        this.actionsMap.set(new Map());
    }
}
