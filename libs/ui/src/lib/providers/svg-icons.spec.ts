import { Component } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { provideSvgIcons } from './svg-icons';

@Component({ template: '' })
class HostComponent {}

const ICONS = [
    { name: 'topic_person', url: '/img/topics/topic_person.svg' },
    { name: 'topic_place', url: '/img/topics/topic_place.svg' },
];

describe('provideSvgIcons', () => {
    let spectator: Spectator<HostComponent>;
    let addSvgIcon: jest.Mock<void, [string, SafeResourceUrl]>;

    const createComponent = createComponentFactory({
        component: HostComponent,
        providers: [
            // The registry is replaced rather than inspected: the real one resolves an icon
            // over HTTP, so asserting on `getNamedSvgIcon` would test Material's loader
            // instead of what this provider does — one `addSvgIcon` per entry it is given.
            { provide: MatIconRegistry, useFactory: () => ({ addSvgIcon }) },
            provideSvgIcons(ICONS),
        ],
    });

    beforeEach(() => {
        addSvgIcon = jest.fn<void, [string, SafeResourceUrl]>();
        spectator = createComponent();
    });

    it('registers one icon per entry it is given', () => {
        expect(addSvgIcon).toHaveBeenCalledTimes(ICONS.length);
        expect(addSvgIcon.mock.calls.map(call => call[0])).toEqual(['topic_person', 'topic_place']);
    });

    it('registers each icon under a sanitized resource URL', () => {
        const sanitizer = spectator.inject(DomSanitizer);
        // eslint-disable-next-line sonarjs/no-angular-bypass-sanitization -- builds the expected SafeValue to compare against; the URLs are this spec's own constants
        const expected = ICONS.map(icon => sanitizer.bypassSecurityTrustResourceUrl(icon.url));

        expect(addSvgIcon.mock.calls.map(call => call[1])).toEqual(expected);
    });
});
