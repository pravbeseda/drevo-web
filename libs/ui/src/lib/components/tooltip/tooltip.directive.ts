import { Directive } from '@angular/core';
import { MatTooltip } from '@angular/material/tooltip';

@Directive({
    selector: '[uiTooltip]',
    hostDirectives: [
        {
            directive: MatTooltip,
            inputs: ['matTooltip: uiTooltip', 'matTooltipPosition: uiTooltipPosition'],
        },
    ],
})
export class TooltipDirective {}
