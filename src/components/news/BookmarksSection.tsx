// ABOUTME: Grid of saved bookmarks, each promotable into Case History.
// ABOUTME: Distinguishes "none saved yet" from "none match the search" — different problems, different copy.

import type { Bookmark, HistoryItem } from '../../lib/types';
import { absDate } from '../../lib/format';
import { highlight } from '../../lib/highlight';
import { BookmarkBtn } from './ui/BookmarkBtn';
import { Icon } from './ui/Icon';

interface Props {
  list: Bookmark[];
  total: number;
  q: string;
  toggleBookmark: (item: Bookmark) => void;
  addToCaseHistory: (bm: Bookmark, fields: Partial<HistoryItem>) => void;
  historyIds: Set<string>;
}

export function BookmarksSection({
  list,
  total,
  q,
  toggleBookmark,
  addToCaseHistory,
  historyIds,
}: Props) {
  if (total === 0) {
    return (
      <div className="empty empty-large">
        <h4>No bookmarks yet</h4>
        <p>Tap the bookmark icon on any article or report to save it here.</p>
      </div>
    );
  }
  if (list.length === 0) {
    return (
      <div className="empty empty-large">
        <h4>No saved items match &lsquo;{q}&rsquo;</h4>
        <p>Try a different search term.</p>
      </div>
    );
  }
  return (
    <div className="saved-grid">
      {list.map((bm) => {
        const inHistory = historyIds.has(bm.id);
        return (
          <article key={bm.id} className="card saved-card">
            <div className="card-meta">
              <span className="meta-source">{bm.source}</span>
              <span className="meta-dot">·</span>
              <span className={'type-chip type-' + bm.type}>{bm.type}</span>
              <span className="meta-spacer"></span>
              <span className="discipline-tag">{bm.discipline}</span>
            </div>
            <h3 className="card-title">
              <a href={bm.url} target="_blank" rel="noopener noreferrer">
                {highlight(bm.title, q)}
              </a>
            </h3>
            <div className="card-meta small">
              <time className="meta meta-date" dateTime={bm.savedAt}>
                SAVED {absDate(bm.savedAt)}
              </time>
            </div>
            <div className="card-foot">
              <button
                className="text-btn"
                onClick={() => addToCaseHistory(bm, { notes: '', tags: [] })}
                disabled={inHistory}
              >
                {inHistory ? (
                  <>
                    {Icon.check}
                    <span>In Case History</span>
                  </>
                ) : (
                  <>
                    {Icon.plus}
                    <span>Add to Case History</span>
                  </>
                )}
              </button>
              <BookmarkBtn saved={true} onClick={() => toggleBookmark(bm)} label={bm.title} />
            </div>
          </article>
        );
      })}
    </div>
  );
}
