import { BadgeComponent } from '../badge/badge.component';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface TabItem {
    readonly label: string;
    readonly route: string;
    readonly badge?: number;
}

@Component({
    selector: 'ui-tabs',
    imports: [MatTabsModule, RouterLink, RouterLinkActive, BadgeComponent],
    templateUrl: './tabs.component.html',
    styleUrl: './tabs.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabsComponent {
    tabs = input.required<TabItem[]>();
}
