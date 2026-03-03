import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'app-diff-tab',
    templateUrl: './diff-tab.component.html',
    styleUrl: './diff-tab.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiffTabComponent {}
