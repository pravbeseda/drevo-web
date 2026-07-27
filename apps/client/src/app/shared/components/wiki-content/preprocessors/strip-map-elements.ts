// Attribute scans are length-bounded so the match stays linear on hostile markup;
// 500 chars is far beyond any real tag we render.
const MAP_ELEMENT = /<(\w+)[^>]{0,500}\sclass="map"[^>]{0,500}>[\s\S]*?<\/\1>/gi;
const SELF_CLOSING_MAP_ELEMENT = /<\w+[^>]{0,500}\sclass="map"[^>]{0,500}\/>/gi;

export function stripMapElements(html: string): string {
    return html.replace(MAP_ELEMENT, '').replace(SELF_CLOSING_MAP_ELEMENT, '');
}
