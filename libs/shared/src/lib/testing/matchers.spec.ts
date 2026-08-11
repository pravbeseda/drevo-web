import { expectAny, expectObjectLike } from './matchers';

describe('typed jest matchers', () => {
    it('should match a value of the given constructor', () => {
        expect({ url: 'https://drevo-info.ru' }).toEqual({ url: expectAny(String) });
    });

    it('should not match a value of another constructor', () => {
        expect({ url: 42 }).not.toEqual({ url: expectAny(String) });
    });

    it('should match a callback in a slot typed as a function', () => {
        // The slot's type is the assertion: `Matched<FunctionConstructor>` has to land on a
        // callable, not on `never`, for this to say anything.
        const expected: { onAction: () => void } = { onAction: expectAny(Function) };

        expect({ onAction: () => undefined }).toEqual(expected);
    });

    it('should match an object by a subset of its fields', () => {
        expect({ id: 10, title: 'Берёза' }).toEqual(expectObjectLike<{ id: number; title: string }>({ id: 10 }));
    });

    it('should not match an object whose listed field differs', () => {
        expect({ id: 11, title: 'Берёза' }).not.toEqual(expectObjectLike<{ id: number; title: string }>({ id: 10 }));
    });
});
