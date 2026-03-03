import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'app-preview',
    templateUrl: './preview.component.html',
    styleUrl: './preview.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreviewComponent {}
