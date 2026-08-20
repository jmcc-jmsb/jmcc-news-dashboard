// ABOUTME: Rail panel listing consulting reports for the active discipline.
// ABOUTME: Caps at 8; offers a browse-all fallback when a discipline has fewer than 3.

import type { FeedItem } from '../../lib/types';
import { ReportCard } from './ui/ReportCard';
import { Icon } from './ui/Icon';

interface Props {
  reports: FeedItem[];
  discipline: string;
  /** Distinguishes "no reports today" from "we could not load them". Claiming
   *  zero during an outage is a quiet lie. */
  status?: 'loading' | 'ready' | 'unavailable';
  isBookmarked: (id: string) => boolean;
  toggleBookmark: (item: FeedItem) => void;
}

export function ReportsPanel({
  reports,
  discipline,
  status = 'ready',
  isBookmarked,
  toggleBookmark,
}: Props) {
  return (
    <div className="rail-block">
      <div className="rail-head">
        <div className="kicker meta">RAIL</div>
        <h3 className="rail-title">Consulting Reports &amp; Insights</h3>
        <p className="rail-sub">
          {status === 'loading'
            ? `Loading · ${discipline}`
            : status === 'unavailable'
              ? `Unavailable · ${discipline}`
              : `${reports.length} report${reports.length !== 1 ? 's' : ''} · ${discipline}`}
        </p>
      </div>
      <div className="report-list">
        {reports.slice(0, 8).map((r) => (
          <ReportCard
            key={r.id}
            item={r}
            saved={isBookmarked(r.id)}
            onToggle={() => toggleBookmark(r)}
          />
        ))}
        {status === 'ready' && reports.length < 3 && (
          <a className="fallback-link" href="#" onClick={(e) => e.preventDefault()}>
            Browse all consulting reports {Icon.arrow}
          </a>
        )}
      </div>
    </div>
  );
}
