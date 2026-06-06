export interface WikiAction {
    readonly name: string;
    canExecute(actionName: string): boolean;
    execute(actionName: string, host: HTMLElement, param?: string): void;
}
