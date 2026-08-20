// ABOUTME: Collapses duplicate items by h(url), keeping the earliest-published copy of each story.
// ABOUTME: Runs before the database write, so a single upsert batch never contains two rows with one id.

import type { FeedItem } from '../types';

/**
 * The same story reaches us more than once: NewsData returns it under two
 * discipline queries, a sponsor query overlaps a discipline query, or a wire
 * story is syndicated. All of those share a URL, so h(url) collapses them.
 *
 * This must run before the upsert, not instead of it. Postgres rejects an
 * INSERT ... ON CONFLICT batch that contains the same key twice — "cannot
 * affect row a second time" — so a duplicate inside one batch fails the whole
 * run, not just that row.
 *
 * Ties break on the EARLIEST published_at. Syndicated copies carry the
 * republication date, and the original is what a delegate should be reading.
 */
export function dedupeById(items: FeedItem[]): FeedItem[] {
  const byId = new Map<string, FeedItem>();

  for (const item of items) {
    const existing = byId.get(item.id);
    if (!existing) {
      byId.set(item.id, item);
      continue;
    }
    if (new Date(item.publishedAt).getTime() < new Date(existing.publishedAt).getTime()) {
      // Keep the earlier copy, but do not lose an AI flag the later copy
      // earned — the two copies can have different descriptions, and only one
      // may carry the phrase that matched.
      byId.set(item.id, { ...item, aiRelevant: item.aiRelevant || existing.aiRelevant });
    } else if (item.aiRelevant && !existing.aiRelevant) {
      byId.set(item.id, { ...existing, aiRelevant: true });
    }
  }

  return [...byId.values()];
}

/** How many duplicates a batch contained. Logged per run so a source that
 *  suddenly overlaps everything else is visible rather than merely quiet. */
export function duplicateCount(items: FeedItem[]): number {
  return items.length - dedupeById(items).length;
}
