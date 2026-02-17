import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatProgressBar } from '@angular/material/progress-bar';

@Component({
    selector: 'ui-navigation-progress',
    imports: [MatProgressBar],
    templateUrl: './navigation-progress.component.html',
    styleUrl: './navigation-progress.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavigationProgressComponent {
    readonly isNavigating = input.required<boolean>();
}
