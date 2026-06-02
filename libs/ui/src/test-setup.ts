import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';

setupZoneTestEnv({
    errorOnUnknownElements: true,
    errorOnUnknownProperties: true,
});

if (typeof CSS === 'undefined') {
    (globalThis as Record<string, unknown>).CSS = {};
}
if (!CSS.escape) {
    CSS.escape = (cssIdentifier: string): string => {
        return cssIdentifier.replace(/[!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~]/g, '\\$&');
    };
}
