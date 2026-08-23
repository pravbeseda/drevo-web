import { setupZonelessTestEnv } from 'jest-preset-angular/setup-env/zoneless';

setupZonelessTestEnv({
    errorOnUnknownElements: true,
    errorOnUnknownProperties: true,
});

// Mock window.matchMedia for tests
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: undefined,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
});

// jsdom does not implement Element.scrollTo, which the layout calls on navigation
if (typeof Element.prototype.scrollTo !== 'function') {
    Element.prototype.scrollTo = (): void => {
        /* no-op */
    };
}

// Polyfill CSS.escape for tests
if (typeof CSS === 'undefined') {
    Object.defineProperty(globalThis, 'CSS', { writable: true, configurable: true, value: {} });
}
if (typeof CSS.escape !== 'function') {
    CSS.escape = (cssIdentifier: string): string => {
        return cssIdentifier.replace(/[!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~]/g, '\\$&');
    };
}
