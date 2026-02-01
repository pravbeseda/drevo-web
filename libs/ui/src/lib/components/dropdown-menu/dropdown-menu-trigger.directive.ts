import { CdkMenuTrigger } from '@angular/cdk/menu';
import { Directive } from '@angular/core';

@Directive({
    selector: '[uiDropdownMenuTriggerFor]',
    hostDirectives: [
        {
            directive: CdkMenuTrigger,
            inputs: ['cdkMenuTriggerFor: uiDropdownMenuTriggerFor'],
        },
    ],
})
export class DropdownMenuTriggerDirective {}
