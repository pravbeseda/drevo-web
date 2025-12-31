import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

@Component({
    selector: 'ui-spinner',
    imports: [MatProgressSpinner],
    template: `
        <mat-spinner
            [diameter]="diameter()"
            [strokeWidth]="strokeWidth()" />
    `,
    styles: `
        :host {
            display: flex;
            align-items: center;
            justify-content: center;
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpinnerComponent {
    diameter = input<number>(40);
    strokeWidth = input<number>(4);
}
