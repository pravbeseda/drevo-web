export type UserRole = 'guest' | 'user' | 'moder' | 'admin';

export const USER_ROLE_LABELS: Record<UserRole, string> = {
    guest: 'Гость',
    user: 'Пользователь',
    moder: 'Модератор',
    admin: 'Администратор',
};

export interface UserPermissions {
    readonly canEdit: boolean;
    readonly canModerate: boolean;
    readonly canAdmin: boolean;
}

export interface User {
    readonly id: number;
    readonly login: string;
    readonly name: string;
    readonly email: string;
    readonly role: UserRole;
    readonly permissions: UserPermissions;
}
