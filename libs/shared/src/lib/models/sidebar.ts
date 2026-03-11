export type SidebarActionPriority = 'primary' | 'secondary';

export interface SidebarAction {
    id: string;
    icon: string;
    iconFile?: string;
    label: string;
    priority: SidebarActionPriority;
    link?: string;
    disabled?: boolean;
    action?: () => void;
}
