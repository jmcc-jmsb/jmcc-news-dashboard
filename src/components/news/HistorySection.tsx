// ABOUTME: List of case-history entries, or the appropriate empty state.
// ABOUTME: Delegates to HistoryRow, which owns each row's edit state.

import type { HistoryItem } from '../../lib/types';
import { HistoryRow } from './HistoryRow';

interface Props {
  list: HistoryItem[];
  total: number;
  q: string;
  remove: (id: string) => void;
  update: (id: string, fields: Partial<HistoryItem>) => void;
}

export function HistorySection({ list, total, q, remove, update }: Props) {
  if (total === 0) {
    return (
      <div className="empty empty-large">
        <h4>Case History is empty</h4>
        <p>
          From any bookmark, choose <em>Add to Case History</em> to track it as case-prep
          material with notes &amp; tags.
        </p>
      </div>
    );
  }
  if (list.length === 0) {
    return (
      <div className="empty empty-large">
        <h4>No case-history items match &lsquo;{q}&rsquo;</h4>
        <p>Try a different search term.</p>
      </div>
    );
  }
  return (
    <div className="history-list">
      {list.map((h) => (
        <HistoryRow key={h.id} item={h} q={q} remove={remove} update={update} />
      ))}
    </div>
  );
}
