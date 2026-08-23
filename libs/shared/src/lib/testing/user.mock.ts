import { User, UserPermissions } from '../models/user';

/**
 * Default authenticated user for tests. A plain `user` role, not a moderator,
 * not review-eligible — override per test as needed.
 */
const DEFAULT_USER: User = {
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
    isReviewer: false,
};

type UserOverrides = Partial<Omit<User, 'permissions'>> & {
    readonly permissions?: Partial<UserPermissions>;
};

/**
 * Build a `User` for tests with sensible defaults. Pass `overrides` to tweak any
 * field; `permissions` is shallow-merged so a test can set just `canModerate`.
 *
 * Single source for User mocks across specs — keeps a new required field (e.g.
 * `isReviewer`) from breaking every test that builds a user by hand.
 */
export function createMockUser(overrides: UserOverrides = {}): User {
    return {
        ...DEFAULT_USER,
        ...overrides,
        permissions: {
            ...DEFAULT_USER.permissions,
            ...overrides.permissions,
        },
    };
}
