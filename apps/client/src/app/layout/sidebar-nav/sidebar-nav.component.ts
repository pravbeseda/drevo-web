import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { DrawerService } from '@drevo-web/core';
import { IconComponent } from '@drevo-web/ui';

interface NavItem {
    readonly label: string;
    readonly route: string;
    readonly icon: string;
}

const NAV_ITEMS: NavItem[] = [
    { label: 'Изменения', route: '/history/articles', icon: 'history' },
    { label: 'Иллюстрации', route: '/pictures', icon: 'image' },
];

@Component({
    selector: 'app-sidebar-nav',
    imports: [RouterLink, RouterLinkActive, IconComponent],
    templateUrl: './sidebar-nav.component.html',
    styleUrl: './sidebar-nav.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '[class.compact]': 'isCompact()',
    },
})
export class SidebarNavComponent {
    private readonly drawerService = inject(DrawerService);

    readonly navItems = NAV_ITEMS;
    readonly isCompact = computed(() => !this.drawerService.isOpen());
}
