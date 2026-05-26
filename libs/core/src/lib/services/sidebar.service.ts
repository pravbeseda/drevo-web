import { Injectable, signal, computed } from '@angular/core';
import { SidebarAction } from '@drevo-web/shared';

@Injectable({
    providedIn: 'root',
})
export class SidebarService {
    private readonly actionsMap = signal<Map<string, SidebarAction>>(new Map());
    // Pages can ask layout to keep the right sidebar slot rendered even when no actions are present
    // (prevents main-column reflow on tab switches). Identified by unique reservation IDs.
    private readonly reservationsSet = signal<ReadonlySet<string>>(new Set());

    readonly actions = computed(() =>
        Array.from(this.actionsMap().values()).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    );

    readonly hasReservation = computed(() => this.reservationsSet().size > 0);

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

    addReservation(id: string): void {
        this.reservationsSet.update(set => {
            const next = new Set(set);
            next.add(id);
            return next;
        });
    }

    removeReservation(id: string): void {
        this.reservationsSet.update(set => {
            const next = new Set(set);
            next.delete(id);
            return next;
        });
    }

    clear(): void {
        this.actionsMap.set(new Map());
    }
}
