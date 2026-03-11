import { BadgeComponent } from '../badge/badge.component';
import { IconComponent } from '../icon/icon.component';
import { ChangeDetectionStrategy, Component, input, Signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface TabGroupItem {
    readonly label: string;
    readonly route: string;
    readonly icon: string;
    readonly badge?: number;
    readonly exactRouteMatch?: boolean;
    readonly isActive?: Signal<boolean>;
}

export interface TabGroup {
    readonly items: readonly TabGroupItem[];
    readonly align?: 'start' | 'end';
}

@Component({
    selector: 'ui-tabs-group',
    imports: [RouterLink, RouterLinkActive, BadgeComponent, IconComponent],
    templateUrl: './tabs-group.component.html',
    styleUrl: './tabs-group.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabsGroupComponent {
    readonly groups = input.required<TabGroup[]>();
}
