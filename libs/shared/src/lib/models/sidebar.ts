export type SidebarActionPriority = 'primary' | 'secondary';

export interface SidebarAction {
    readonly id: string;
    readonly icon: string;
    readonly svgIcon?: string;
    readonly label: string;
    readonly priority: SidebarActionPriority;
    readonly link?: string;
    readonly order?: number;
    readonly disabled?: boolean;
    readonly badge?: number;
    readonly testId?: string;
    readonly action?: () => void;
}
