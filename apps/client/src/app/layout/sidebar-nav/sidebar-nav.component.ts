import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent } from '@drevo-web/ui';

interface NavItem {
    readonly label: string;
    readonly route: string;
    readonly icon: string;
}

const NAV_ITEMS: NavItem[] = [
    { label: 'Изменения', route: '/articles/history', icon: 'history' },
];

@Component({
    selector: 'app-sidebar-nav',
    imports: [RouterLink, RouterLinkActive, IconComponent],
    templateUrl: './sidebar-nav.component.html',
    styleUrl: './sidebar-nav.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarNavComponent {
    readonly navItems = NAV_ITEMS;
}
