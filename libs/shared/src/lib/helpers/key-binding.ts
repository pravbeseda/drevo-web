const MAC_AGENT = /Mac|iPhone|iPad/;

/** Whether the reader's platform calls CodeMirror's `Mod` key ⌘; a server render has no window and counts as not. */
export function isMacPlatform(window: Window | undefined): boolean {
    return !!window && MAC_AGENT.test(window.navigator.userAgent);
}

/** A CodeMirror key binding such as `Mod-Enter`, spelled the way the platform prints shortcuts. */
export function formatKeyBinding(binding: string, mac: boolean): string {
    return binding.replace('Mod', mac ? '⌘' : 'Ctrl').replace(/-/g, mac ? '' : '+');
}
