import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface TabItem {
    label: string;
    route: string;
    badge?: number;
}

@Component({
    selector: 'ui-tabs',
    imports: [MatTabsModule, RouterLink, RouterLinkActive],
    templateUrl: './tabs.component.html',
    styleUrl: './tabs.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabsComponent {
    tabs = input.required<TabItem[]>();
}
