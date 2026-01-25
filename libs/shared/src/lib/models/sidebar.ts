export type SidebarActionPriority = 'primary' | 'secondary';

export interface SidebarAction {
    id: string;
    icon: string;
    label: string;
    priority: SidebarActionPriority;
    href?: string;
    disabled?: boolean;
    action?: () => void;
}
