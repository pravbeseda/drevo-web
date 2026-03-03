import { ChangeDetectionStrategy, Component, contentChild, input, TemplateRef } from '@angular/core';

@Component({
    selector: 'ui-workspace-tab',
    template: '',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceTabComponent {
    readonly label = input.required<string>();
    readonly icon = input.required<string>();
    readonly keepAlive = input(false);
    readonly contentTemplate = contentChild(TemplateRef);
}
