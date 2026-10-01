import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { WINDOW } from '@drevo-web/core';
import { ButtonComponent, IconButtonComponent } from '@drevo-web/ui';

/**
 * The bar under a forum editor: attaching on the left, not yet available, the
 * host's own tools after it, and sending on the right with its shortcut.
 */
@Component({
    selector: 'app-forum-send-bar',
    imports: [ButtonComponent, IconButtonComponent],
    templateUrl: './forum-send-bar.component.html',
    styleUrl: './forum-send-bar.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForumSendBarComponent {
    readonly disabled = input<boolean>(false);
    readonly loading = input<boolean>(false);

    readonly send = output();

    /** The editor binds `Mod-Enter`, which is ⌘ on a Mac. */
    protected readonly sendKey = /Mac|iPhone|iPad/.test(inject(WINDOW)?.navigator.userAgent ?? '') ? '⌘' : 'Ctrl';
}
