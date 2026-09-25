import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { avatarNameColor } from './avatar-color';
import { AvatarComponent } from './avatar.component';

/** The tone number a themed avatar variable ends with. */
const toneOf = (cssValue: string): string | undefined => /-(\d+)\)$/.exec(cssValue)?.[1];

describe('AvatarComponent', () => {
    let spectator: Spectator<AvatarComponent>;

    const createComponent = createComponentFactory({
        component: AvatarComponent,
    });

    const render = (name: string): void => {
        spectator = createComponent({ props: { name } });
    };

    it.each([
        ['Андрей Петров', 'АП'],
        ['Иванов И.И.', 'ИИ'],
        ['о. Николай', 'ОН'],
        ['Гость', 'Г'],
        ['— Гость', 'Г'],
        ['Анна Мария Петрова', 'АМ'],
    ])('shows the initials of «%s» as %s', (name, initials) => {
        render(name);

        expect(spectator.element).toHaveExactTrimmedText(initials);
    });

    it('names the person for assistive technology', () => {
        render('Андрей Петров');

        expect(spectator.element).toHaveAttribute('role', 'img');
        expect(spectator.element).toHaveAttribute('aria-label', 'Андрей Петров');
    });

    it('paints the circle with a themed avatar tone', () => {
        render('Андрей Петров');

        expect(spectator.element.style.backgroundColor).toMatch(/^var\(--themed-avatar-bg-\d+\)$/);
    });

    it('gives one name the same tone every time', () => {
        render('Андрей Петров');
        const first = spectator.element.style.backgroundColor;
        render('Андрей Петров');

        expect(spectator.element.style.backgroundColor).toBe(first);
    });

    it('tells people apart by the whole name, not only its first word', () => {
        const tones = new Set(
            ['Андрей Петров', 'Андрей Смирнов', 'Андрей Козлов', 'Андрей Соколов', 'Андрей Новиков'].map(name => {
                render(name);
                return spectator.element.style.backgroundColor;
            }),
        );

        expect(tones.size).toBeGreaterThan(1);
    });

    it('is medium-sized unless asked otherwise', () => {
        render('Андрей Петров');

        expect(spectator.element).not.toHaveClass('ui-avatar--sm');
    });

    it('shrinks when asked for the small size', () => {
        spectator = createComponent({ props: { name: 'Андрей Петров', size: 'sm' } });

        expect(spectator.element).toHaveClass('ui-avatar--sm');
    });
});

describe('avatarNameColor', () => {
    const createComponent = createComponentFactory({
        component: AvatarComponent,
    });

    it('colours a name in the tone its avatar is painted with', () => {
        const spectator = createComponent({ props: { name: 'Мария Ивановна' } });

        expect(avatarNameColor('Мария Ивановна')).toMatch(/^var\(--themed-avatar-name-\d+\)$/);
        expect(toneOf(avatarNameColor('Мария Ивановна'))).toBe(toneOf(spectator.element.style.backgroundColor));
    });
});
