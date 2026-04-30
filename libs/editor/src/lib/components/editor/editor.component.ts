import { CustomToolbarAction, TOOLBAR_GROUPS, ToolbarAction } from './editor-toolbar.config';
import { linksUpdatedEffect } from '../../constants/editor-effects';
import { insertTagInView } from '../../helpers/insert-tag';
import { EditorFactoryService } from '../../services/editor-factory/editor-factory.service';
import { WikiHighlighterService } from '../../services/wiki-highlighter/wiki-highlighter.service';
import { isPlatformBrowser } from '@angular/common';
import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    effect,
    ElementRef,
    EventEmitter,
    inject,
    input,
    Input,
    OnInit,
    Output,
    PLATFORM_ID,
    ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { InsertTagCommand } from '@drevo-web/shared';
import { IconComponent } from '@drevo-web/ui';
import { BehaviorSubject, debounceTime, filter } from 'rxjs';

const LINKS_CHECK_DEBOUNCE_MS = 300;

interface ToolbarActionView {
    readonly id: string;
    readonly icon: string;
    readonly fontSet?: string;
    readonly tooltipWithKey: string;
    readonly command: InsertTagCommand;
}

interface ToolbarGroupView {
    readonly actions: readonly ToolbarActionView[];
}

function buildTooltip(action: ToolbarAction, isMac: boolean): string {
    if (!action.keyBinding) {
        return action.tooltip;
    }
    const key = action.keyBinding
        .replace('Mod', isMac ? '⌘' : 'Ctrl')
        .replace(/-/g, isMac ? '' : '+');
    return `${action.tooltip} (${key})`;
}

function buildToolbarGroups(isMac: boolean): readonly ToolbarGroupView[] {
    return TOOLBAR_GROUPS.map(group => ({
        actions: group.actions.map(action => ({
            id: action.id,
            icon: action.icon,
            fontSet: action.fontSet,
            tooltipWithKey: buildTooltip(action, isMac),
            command: action.command,
        })),
    }));
}

@Component({
    selector: 'lib-editor',
    imports: [IconComponent],
    providers: [EditorFactoryService, WikiHighlighterService],
    templateUrl: './editor.component.html',
    styleUrls: ['./editor.component.scss', 'codemirror-custom.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditorComponent implements OnInit, AfterViewInit {
    private linksSubject = new BehaviorSubject<Record<string, boolean>>({});

    @ViewChild('editorContainer')
    editorContainer?: ElementRef;

    readonly content = input.required<string>();
    readonly customExtensions = input<Extension[]>([]);
    readonly showToolbar = input(true);
    readonly customActions = input<CustomToolbarAction[]>([]);

    @Input()
    set insertTagCommand(command: InsertTagCommand | null) {
        if (!command) {
            return;
        }
        this.insertTag(command);
    }

    @Output()
    readonly updateLinksEvent = new EventEmitter<string[]>();

    @Output()
    readonly contentChanged = new EventEmitter<string>();

    @Input()
    set linksStatus(links: Record<string, boolean>) {
        this.linksSubject.next(links);

        this.wikiHighlighterService.updateLinksState(links).then(changed => {
            if (changed && this.editor) {
                this.editor.dispatch({
                    effects: linksUpdatedEffect.of(undefined),
                });
            }
        });
    }
    get linksStatus(): Record<string, boolean> {
        return this.linksSubject.getValue();
    }

    readonly toolbarGroups: readonly ToolbarGroupView[];

    private editor?: EditorView;

    private readonly destroyRef = inject(DestroyRef);
    private readonly editorFactory = inject(EditorFactoryService);
    private readonly wikiHighlighterService = inject(WikiHighlighterService);
    private readonly platformId = inject(PLATFORM_ID);

    constructor() {
        const isMac = isPlatformBrowser(this.platformId) && /Mac|iPhone|iPad/.test(navigator.userAgent);
        this.toolbarGroups = buildToolbarGroups(isMac);

        effect(() => {
            const newContent = this.content();
            if (!this.editor) return;

            const currentContent = this.editor.state.doc.toString();
            if (currentContent !== newContent) {
                this.editor.dispatch({
                    changes: { from: 0, to: currentContent.length, insert: newContent },
                });
            }
        });
    }

    ngOnInit() {
        this.wikiHighlighterService.updateLinks$
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                filter(links => links.length > 0),
                debounceTime(LINKS_CHECK_DEBOUNCE_MS),
            )
            .subscribe(links => {
                this.updateLinksEvent.emit(links);
            });
    }

    ngAfterViewInit(): void {
        if (this.editorFactory.isServer() || !this.editorContainer) return;

        this.editor = new EditorView({
            state: this.editorFactory.createState(this.content(), this.customExtensions()),
            parent: this.editorContainer.nativeElement,
        });

        this.editorFactory.setChangeHandler(text => this.contentChanged.emit(text));

        this.editor.contentDOM.setAttribute('spellcheck', 'true');
        this.editor.contentDOM.setAttribute('autocorrect', 'on');
    }

    insertText(command: InsertTagCommand): void {
        this.insertTag(command);
    }

    requestMeasure(): void {
        this.editor?.requestMeasure();
    }

    onToolbarAction(action: ToolbarActionView): void {
        this.insertTag(action.command);
    }

    private insertTag(command: InsertTagCommand): void {
        if (!this.editor) {
            return;
        }
        insertTagInView(this.editor, command);
    }
}
