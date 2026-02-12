import { IconButtonComponent } from '../icon-button/icon-button.component';
import {
    ChangeDetectionStrategy,
    Component,
    input,
    output,
} from '@angular/core';

@Component({
    selector: 'ui-side-panel',
    imports: [IconButtonComponent],
    templateUrl: './side-panel.component.html',
    styleUrl: './side-panel.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidePanelComponent {
    readonly open = input(false);
    readonly title = input<string>();
    readonly closed = output<void>();

    close(): void {
        this.closed.emit();
    }
}
