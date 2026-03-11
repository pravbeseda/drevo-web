import { ENVIRONMENT_INITIALIZER, EnvironmentProviders, inject, makeEnvironmentProviders } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';

export interface SvgIconConfig {
    readonly name: string;
    readonly url: string;
}

export function provideSvgIcons(icons: readonly SvgIconConfig[]): EnvironmentProviders {
    return makeEnvironmentProviders([
        {
            provide: ENVIRONMENT_INITIALIZER,
            multi: true,
            useValue: () => {
                const registry = inject(MatIconRegistry);
                const sanitizer = inject(DomSanitizer);

                for (const icon of icons) {
                    registry.addSvgIcon(icon.name, sanitizer.bypassSecurityTrustResourceUrl(icon.url));
                }
            },
        },
    ]);
}
