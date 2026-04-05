import { User } from '@drevo-web/shared';

export const mockUsers = {
    authenticated: {
        id: 1,
        login: 'testuser',
        name: 'Test User',
        email: 'testuser@example.com',
        role: 'user',
        permissions: {
            canEdit: true,
            canModerate: false,
            canAdmin: false,
        },
    } satisfies User,

    moderator: {
        id: 2,
        login: 'moderator',
        name: 'Moderator User',
        email: 'moderator@example.com',
        role: 'moder',
        permissions: {
            canEdit: true,
            canModerate: true,
            canAdmin: false,
        },
    } satisfies User,

    admin: {
        id: 3,
        login: 'admin',
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'admin',
        permissions: {
            canEdit: true,
            canModerate: true,
            canAdmin: true,
        },
    } satisfies User,
};
