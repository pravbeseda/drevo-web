import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonComponent, IconComponent } from '@drevo-web/ui';

/** The bar under a forum editor: attaching on the left, not yet available, and sending on the right. */
@Component({
    selector: 'app-forum-send-bar',
    imports: [ButtonComponent, IconComponent],
    templateUrl: './forum-send-bar.component.html',
    styleUrl: './forum-send-bar.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForumSendBarComponent {
    readonly disabled = input<boolean>(false);
    readonly loading = input<boolean>(false);

    readonly send = output();
}
