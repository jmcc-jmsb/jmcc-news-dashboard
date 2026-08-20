// ABOUTME: One news article — source, relative time, discipline tag, title link, description.
// ABOUTME: Title and description only; never full article text (brief §10, Copyright).

import type { FeedItem } from '../../../lib/types';
import { absDate, relTime } from '../../../lib/format';
import { highlight } from '../../../lib/highlight';
import { AiBadge } from './AiBadge';
import { BookmarkBtn } from './BookmarkBtn';
import { Icon } from './Icon';

interface Props {
  item: FeedItem;
  saved: boolean;
  onToggle: () => void;
  q?: string;
}

export function ArticleCard({ item, saved, onToggle, q = '' }: Props) {
  return (
    <article className="card article-card">
      <div className="card-meta">
        <span className="meta-source">{item.source}</span>
        <span className="meta-dot">·</span>
        <time className="meta-date" dateTime={item.publishedAt} title={absDate(item.publishedAt)}>
          {relTime(item.publishedAt)}
        </time>
        <span className="meta-spacer"></span>
        {item.aiRelevant && <AiBadge />}
        <span className="discipline-tag">{item.discipline}</span>
      </div>
      <h3 className="card-title">
        <a href={item.url} target="_blank" rel="noopener noreferrer">
          {highlight(item.title, q)}
        </a>
      </h3>
      <p className="card-desc">{highlight(item.description, q)}</p>
      <div className="card-foot">
        <a className="read-link" href={item.url} target="_blank" rel="noopener noreferrer">
          Read article {Icon.external}
        </a>
        <BookmarkBtn saved={saved} onClick={onToggle} label={item.title} />
      </div>
    </article>
  );
}
