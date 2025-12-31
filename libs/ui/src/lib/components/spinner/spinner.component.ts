import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

@Component({
    selector: 'ui-spinner',
    imports: [MatProgressSpinner],
    templateUrl: './spinner.component.html',
    styleUrl: './spinner.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpinnerComponent {
    diameter = input<number>(40);
    strokeWidth = input<number>(4);
}
