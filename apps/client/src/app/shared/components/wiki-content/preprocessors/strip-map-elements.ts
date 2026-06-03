export function stripMapElements(html: string): string {
    return html.replace(/<(\w+)[^>]*\sclass="map"[^>]*>[\s\S]*?<\/\1>|<\w+[^>]*\sclass="map"[^>]*\/>/gi, '');
}
