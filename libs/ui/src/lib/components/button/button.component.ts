import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';

export type ButtonVariant = 'filled' | 'outlined' | 'text';
export type ButtonAccent = 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
export type ButtonType = 'button' | 'submit' | 'reset';

@Component({
    selector: 'ui-button',
    imports: [NgTemplateOutlet, RouterLink, MatButtonModule, MatProgressSpinnerModule],
    templateUrl: './button.component.html',
    styleUrl: './button.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '(click)': 'onHostClick($event)',
    },
})
export class ButtonComponent {
    variant = input<ButtonVariant>('filled');
    accent = input<ButtonAccent>('secondary');
    type = input<ButtonType>('button');
    testId = input<string>();
    disabled = input<boolean>(false);
    loading = input<boolean>(false);
    fullWidth = input<boolean>(false);
    link = input<string | undefined>(undefined);

    protected readonly accentClass = computed(() => `accent-${this.accent()}`);

    // Level 1: blocks consumer (click) handlers on host
    protected onHostClick(event: MouseEvent): void {
        if (this.disabled() || this.loading()) {
            event.stopImmediatePropagation();
            event.preventDefault();
        }
    }

    // Level 2: blocks RouterLink navigation on <a> before event bubbles to host
    protected onLinkClick(event: MouseEvent): void {
        if (this.disabled() || this.loading()) {
            event.preventDefault();
            event.stopPropagation();
        }
    }
}
