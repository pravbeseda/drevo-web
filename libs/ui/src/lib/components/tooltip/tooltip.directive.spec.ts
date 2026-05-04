import { Component } from '@angular/core';
import { MatTooltip } from '@angular/material/tooltip';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { TooltipDirective } from './tooltip.directive';

@Component({
    imports: [TooltipDirective],
    template: `<span uiTooltip="Подсказка" data-testid="host">Текст</span>`,
})
class HostComponent {}

describe('TooltipDirective', () => {
    let spectator: Spectator<HostComponent>;

    const createComponent = createComponentFactory({
        component: HostComponent,
        imports: [NoopAnimationsModule],
    });

    beforeEach(() => {
        spectator = createComponent();
    });

    it('should create host element', () => {
        expect(spectator.query('[data-testid="host"]')).toBeTruthy();
    });

    it('should attach MatTooltip with provided text', () => {
        const tooltip = spectator.query('[data-testid="host"]', { read: MatTooltip });

        expect(tooltip).toBeTruthy();
        expect(tooltip?.message).toBe('Подсказка');
    });
});
