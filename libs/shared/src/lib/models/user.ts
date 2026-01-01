export type UserRole = 'guest' | 'user' | 'moder' | 'admin';

export interface UserPermissions {
    canEdit: boolean;
    canModerate: boolean;
    canAdmin: boolean;
}

export interface User {
    id: number;
    login: string;
    name: string;
    email: string;
    role: UserRole;
    permissions: UserPermissions;
}
