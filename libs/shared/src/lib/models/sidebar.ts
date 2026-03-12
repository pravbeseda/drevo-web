export type SidebarActionPriority = 'primary' | 'secondary';

export interface SidebarAction {
    id: string;
    icon: string;
    svgIcon?: string;
    label: string;
    priority: SidebarActionPriority;
    link?: string;
    order?: number;
    disabled?: boolean;
    badge?: number;
    action?: () => void;
}
