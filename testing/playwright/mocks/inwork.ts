import { InworkItemDto } from '@drevo-web/shared';

/** Create a single InworkItemDto with overrides */
export function createInworkItemDto(overrides: Partial<InworkItemDto> = {}, index = 1): InworkItemDto {
    return {
        id: index,
        module: 'articles',
        title: `Статья ${index}`,
        author: 'testuser',
        lasttime: '2025-01-15T12:00:00',
        age: 120,
        ...overrides,
    };
}
