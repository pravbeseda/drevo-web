const NEWS_SECTION_ID = 'news';

/** How a topic names the page it hangs off: a news item is told from an article by its section id. */
export function forumOwnerPrefix(sectionId: string | undefined): string {
    return sectionId === NEWS_SECTION_ID ? 'к новости' : 'к статье';
}
