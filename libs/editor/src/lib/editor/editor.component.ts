import {
    AfterViewInit,
    Component,
    ElementRef,
    Inject,
    PLATFORM_ID,
    ViewChild,
} from '@angular/core';
import { CommonModule, isPlatformServer } from '@angular/common';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { basicSetup } from 'codemirror';

@Component({
    selector: 'lib-editor',
    imports: [CommonModule],
    templateUrl: './editor.component.html',
    styleUrl: './editor.component.scss',
})
export class EditorComponent implements AfterViewInit {
    @ViewChild('editorContainer')
    editorContainer?: ElementRef;

    constructor(private host: ElementRef, @Inject(PLATFORM_ID) private platformId: object) {}

    ngAfterViewInit(): void {
        if (isPlatformServer(this.platformId)) {
            return;
        }

        if (!this.editorContainer) {
            return;
        }

        const editor = new EditorView({
            state: EditorState.create({
                doc: 'Text...',
                extensions: [basicSetup],
            }),
            parent: this.editorContainer.nativeElement,
        });
    }
}
