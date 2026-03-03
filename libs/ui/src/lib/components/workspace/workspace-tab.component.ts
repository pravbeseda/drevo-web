import { ChangeDetectionStrategy, Component, ContentChild, input, TemplateRef } from '@angular/core';

@Component({
    selector: 'ui-workspace-tab',
    template: '',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceTabComponent {
    readonly label = input.required<string>();
    readonly icon = input.required<string>();
    readonly keepAlive = input(false);

    @ContentChild(TemplateRef)
    contentTemplate?: TemplateRef<unknown>;
}
