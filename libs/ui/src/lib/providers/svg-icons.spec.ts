import { Component } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { provideSvgIcons } from './svg-icons';

@Component({ template: '' })
class HostComponent {}

describe('provideSvgIcons', () => {
    let spectator: Spectator<HostComponent>;

    const createComponent = createComponentFactory({
        component: HostComponent,
        providers: [
            provideSvgIcons([
                { name: 'topic_person', url: '/img/topics/topic_person.svg' },
                { name: 'topic_place', url: '/img/topics/topic_place.svg' },
            ]),
        ],
    });

    beforeEach(() => {
        spectator = createComponent();
    });

    it('registers every icon it is given', () => {
        const registry = spectator.inject(MatIconRegistry);

        expect(registry.getNamedSvgIcon('topic_person')).toBeTruthy();
        expect(registry.getNamedSvgIcon('topic_place')).toBeTruthy();
    });

    it('leaves an icon it was not given unregistered', done => {
        spectator
            .inject(MatIconRegistry)
            .getNamedSvgIcon('topic_absent')
            .subscribe({
                next: () => {
                    done(new Error('the registry resolved an icon that was never registered'));
                },
                error: (error: unknown) => {
                    expect(String(error)).toContain('topic_absent');
                    done();
                },
            });
    });
});
