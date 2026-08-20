// ABOUTME: One consulting report in the rail — publisher, title link, description, date.
// ABOUTME: The prototype's data-source attribute is gone; all five colour rules were deleted in the re-skin.

import type { FeedItem } from '../../../lib/types';
import { absDate } from '../../../lib/format';
import { BookmarkBtn } from './BookmarkBtn';

interface Props {
  item: FeedItem;
  saved: boolean;
  onToggle: () => void;
}

export function ReportCard({ item, saved, onToggle }: Props) {
  return (
    <article className="card report-card">
      <div className="report-source">{item.source}</div>
      <h4 className="report-title">
        <a href={item.url} target="_blank" rel="noopener noreferrer">
          {item.title}
        </a>
      </h4>
      <p className="report-desc">{item.description}</p>
      <div className="report-foot">
        <time className="meta-date" dateTime={item.publishedAt}>
          {absDate(item.publishedAt)}
        </time>
        <BookmarkBtn saved={saved} onClick={onToggle} label={item.title} />
      </div>
    </article>
  );
}
