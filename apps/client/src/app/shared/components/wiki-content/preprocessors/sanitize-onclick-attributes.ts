export function sanitizeOnclickAttributes(html: string): string {
    return html.replace(/\s+onclick=(["'])(javascript:[\s\S]*?)\1/gi, ' data-onclick=$1$2$1');
}
