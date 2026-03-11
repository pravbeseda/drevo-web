export type SidebarActionPriority = 'primary' | 'secondary';

export interface SidebarAction {
    id: string;
    icon: string;
    svgIcon?: string;
    label: string;
    tooltip?: string;
    priority: SidebarActionPriority;
    link?: string;
    disabled?: boolean;
    badge?: number;
    action?: () => void;
}
