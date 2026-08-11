/**
 * Typed wrappers over jest's asymmetric matchers.
 *
 * `@types/jest` declares `expect.any()` and `expect.objectContaining()` as returning `any`, so
 * every expected literal that embeds one — `{ data: expect.objectContaining({ id: 10 }) }` —
 * is an unsafe assignment. These wrappers keep the call site typed and hold the single
 * assertion each matcher needs.
 */

/**
 * What a constructor stands for as a value: the primitive for the wrapper objects, the
 * instance type for everything else.
 */
type Matched<C> = C extends StringConstructor
    ? string
    : C extends NumberConstructor
      ? number
      : C extends BooleanConstructor
        ? boolean
        : C extends abstract new (...args: never[]) => infer I
          ? I
          : never;

/** `expect.any(String)`, typed as the value it stands in for. */
export function expectAny<C>(constructor: C): Matched<C> {
    return expect.any(constructor) as Matched<C>;
}

/** `expect.objectContaining(shape)`, typed as the object it stands in for. */
export function expectObjectLike<T>(shape: Partial<T>): T {
    return expect.objectContaining(shape) as T;
}
