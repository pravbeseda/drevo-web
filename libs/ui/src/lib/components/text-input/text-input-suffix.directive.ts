import { Directive } from '@angular/core';

/** Marks the content `ui-text-input` puts at the end of its field, such as an icon button. */
@Directive({
    selector: '[uiTextInputSuffix]',
})
export class TextInputSuffixDirective {}
