import { InsertTagCommand } from '@drevo-web/shared';

export interface ToolbarAction {
    readonly id: string;
    readonly icon: string;
    readonly tooltip: string;
    readonly command: InsertTagCommand;
    readonly keyBinding?: string;
}

export interface ToolbarGroup {
    readonly actions: readonly ToolbarAction[];
}

export interface CustomToolbarAction {
    readonly icon: string;
    readonly tooltip: string;
    readonly callback: () => void;
}

export const TOOLBAR_GROUPS: readonly ToolbarGroup[] = [
    {
        actions: [
            {
                id: 'bold',
                icon: 'format_bold',
                tooltip: 'Жирный',
                command: { tagOpen: '*', tagClose: '*', sampleText: 'жирный текст' },
                keyBinding: 'Mod-b',
            },
            {
                id: 'italic',
                icon: 'format_italic',
                tooltip: 'Курсив',
                command: { tagOpen: '_', tagClose: '_', sampleText: 'курсив' },
                keyBinding: 'Mod-i',
            },
        ],
    },
    {
        actions: [
            {
                id: 'link',
                icon: 'link',
                tooltip: 'Ссылка',
                command: { tagOpen: '((', tagClose: '))', sampleText: 'ссылка' },
                keyBinding: 'Mod-k',
            },
        ],
    },
    {
        actions: [
            {
                id: 'heading',
                icon: 'title',
                tooltip: 'Раздел',
                command: { tagOpen: '== ', tagClose: ' ==', sampleText: 'раздел' },
            },
            {
                id: 'subheading',
                icon: 'format_size',
                tooltip: 'Подраздел',
                command: { tagOpen: '=== ', tagClose: ' ===', sampleText: 'подраздел' },
            },
        ],
    },
    {
        actions: [
            {
                id: 'bullet-list',
                icon: 'format_list_bulleted',
                tooltip: 'Маркированный список',
                command: { tagOpen: '* ', tagClose: '', sampleText: 'элемент списка' },
            },
            {
                id: 'numbered-list',
                icon: 'format_list_numbered',
                tooltip: 'Нумерованный список',
                command: { tagOpen: '# ', tagClose: '', sampleText: 'элемент списка' },
            },
        ],
    },
];
