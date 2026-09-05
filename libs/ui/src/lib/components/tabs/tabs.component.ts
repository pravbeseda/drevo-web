import { BadgeComponent } from '../badge/badge.component';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltip } from '@angular/material/tooltip';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface TabItem {
    readonly label: string;
    readonly route: string;
    readonly badge?: number;
    readonly testId?: string;
    /** Hint shown on hover; the tab label stays the accessible name. */
    readonly tooltip?: string;
    /** Set on a tab whose route is the prefix of another tab's, so only its own address activates it. */
    readonly exact?: boolean;
}

@Component({
    selector: 'ui-tabs',
    imports: [MatTabsModule, MatTooltip, RouterLink, RouterLinkActive, BadgeComponent],
    templateUrl: './tabs.component.html',
    styleUrl: './tabs.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabsComponent {
    tabs = input.required<TabItem[]>();
}
