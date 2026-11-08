import { CountsService } from '../../services/counts/counts.service';
import { ChangeDetectionStrategy, Component, computed, inject, Signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { DrawerService } from '@drevo-web/core';
import { BadgeComponent } from '@drevo-web/ui/badge';
import { IconComponent } from '@drevo-web/ui/icon';

const MAX_BADGE_COUNT = 99;

interface NavItem {
    readonly label: string;
    readonly route: string;
    readonly icon: string;
    readonly badge?: {
        readonly count: 'pendingTotal' | 'forumUnread';
        readonly description: string;
    };
}

interface NavEntry {
    readonly label: string;
    readonly route: string;
    readonly icon: string;
    readonly badge: string | undefined;
    readonly ariaLabel: string;
}

const NAV_ITEMS: readonly NavItem[] = [
    {
        label: 'Изменения',
        route: '/history/articles',
        icon: 'history',
        badge: { count: 'pendingTotal', description: 'на модерации' },
    },
    { label: 'Иллюстрации', route: '/pictures', icon: 'photo_library' },
    { label: 'Календарь', route: '/calendar', icon: 'calendar_month' },
    {
        label: 'Форум',
        route: '/forum',
        icon: 'forum',
        badge: { count: 'forumUnread', description: 'непрочитанных' },
    },
];

@Component({
    selector: 'app-sidebar-nav',
    imports: [RouterLink, RouterLinkActive, BadgeComponent, IconComponent],
    templateUrl: './sidebar-nav.component.html',
    styleUrl: './sidebar-nav.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '[class.compact]': 'isCompact()',
    },
})
export class SidebarNavComponent {
    private readonly drawerService = inject(DrawerService);
    private readonly countsService = inject(CountsService);

    readonly navItems: Signal<readonly NavEntry[]> = computed(() => NAV_ITEMS.map(item => this.toEntry(item)));
    readonly isCompact = computed(() => !this.drawerService.isOpen());

    private toEntry({ label, route, icon, badge }: NavItem): NavEntry {
        const count = badge ? this.countsService[badge.count]() : 0;
        if (!badge || count === 0) {
            return { label, route, icon, badge: undefined, ariaLabel: label };
        }
        return {
            label,
            route,
            icon,
            badge: count > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : `${count}`,
            ariaLabel: `${label}: ${badge.description} ${count}`,
        };
    }
}
