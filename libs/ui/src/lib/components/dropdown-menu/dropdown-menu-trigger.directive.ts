import { Directive } from '@angular/core';
import { MatMenuTrigger } from '@angular/material/menu';

@Directive({
    selector: '[uiDropdownMenuTriggerFor]',
    hostDirectives: [
        {
            directive: MatMenuTrigger,
            inputs: ['matMenuTriggerFor: uiDropdownMenuTriggerFor'],
        },
    ],
})
export class DropdownMenuTriggerDirective {}
