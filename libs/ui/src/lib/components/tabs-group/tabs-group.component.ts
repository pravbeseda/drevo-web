import { BadgeComponent } from '../badge/badge.component';
import { IconComponent } from '../icon/icon.component';
import { ChangeDetectionStrategy, Component, input, Signal } from '@angular/core';
import { IsActiveMatchOptions, RouterLink, RouterLinkActive } from '@angular/router';

export interface TabGroupItem {
    readonly label: string;
    readonly route: string;
    readonly icon: string;
    readonly badge?: number;
    readonly exactRouteMatch?: boolean;
    readonly isActive?: Signal<boolean>;
    readonly testId?: string;
}

export interface TabGroup {
    readonly items: readonly TabGroupItem[];
    readonly align?: 'start' | 'end';
}

/**
 * Angular's own `{ exact: true }` shorthand would pin the query string too, so
 * a tab would go dark on its own address as soon as it carried `?page=2`.
 */
const EXACT_PATH_MATCH: IsActiveMatchOptions = {
    paths: 'exact',
    fragment: 'ignored',
    matrixParams: 'ignored',
    queryParams: 'subset',
};

const PREFIX_PATH_MATCH: IsActiveMatchOptions = { ...EXACT_PATH_MATCH, paths: 'subset' };

@Component({
    selector: 'ui-tabs-group',
    imports: [RouterLink, RouterLinkActive, BadgeComponent, IconComponent],
    templateUrl: './tabs-group.component.html',
    styleUrl: './tabs-group.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabsGroupComponent {
    readonly groups = input.required<TabGroup[]>();

    protected readonly exactPathMatch = EXACT_PATH_MATCH;
    protected readonly prefixPathMatch = PREFIX_PATH_MATCH;

    protected isCurrent(tab: TabGroupItem, routerActive: boolean): boolean {
        return tab.isActive ? tab.isActive() : routerActive;
    }
}
