import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'app-sections',
    templateUrl: './sections.component.html',
    styleUrl: './sections.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionsComponent {}
