import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'app-pictures',
    template: '<p>Иллюстрации — в разработке</p>',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PicturesComponent {}
