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

// Polyfill CSS.escape for tests
if (typeof CSS === 'undefined') {
    (global as any).CSS = {};
}
if (!CSS.escape) {
    CSS.escape = (cssIdentifier: string): string => {
        return cssIdentifier.replace(
            /[!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~]/g,
            '\\$&'
        );
    };
}
