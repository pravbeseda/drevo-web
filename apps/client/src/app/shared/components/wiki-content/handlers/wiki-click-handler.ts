export interface WikiClickHandler {
    handleClick(event: MouseEvent, target: HTMLElement, host: HTMLElement): boolean;
}
