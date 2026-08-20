// ABOUTME: Sponsor Watch rail — hides itself entirely when there are no active sponsors.
// ABOUTME: Never renders an empty rail, and never invents a sponsor (brief §3d).

import { useEffect, useState } from 'react';
import type { FeedItem } from '../../lib/types';
import { ReportCard } from './ui/ReportCard';

interface Sponsor {
  id: string;
  name: string;
}

interface Props {
  articles: FeedItem[];
  isBookmarked: (id: string) => boolean;
  toggleBookmark: (item: FeedItem) => void;
}

/**
 * Ships doing nothing. Sponsors are not known yet (brief §3d), so at launch
 * /api/sponsors returns an empty list and this component renders null — no
 * heading, no placeholder, no "sponsors coming soon".
 *
 * That is the same pattern as the Technical Specs tab hiding itself: an absent
 * section is correct, an empty one is a bug.
 */
export function SponsorWatch({ articles, isBookmarked, toggleBookmark }: Props) {
  const [sponsors, setSponsors] = useState<Sponsor[] | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    fetch('/api/sponsors', { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : { sponsors: [] }))
      .then((b) => setSponsors(b.sponsors ?? []))
      // A failed sponsor lookup hides the section rather than showing an
      // error. Sponsor news is an enhancement; it is not worth an alarm in a
      // delegate's feed.
      .catch(() => setSponsors([]));
    return () => ac.abort();
  }, []);

  // null while loading: rendering a heading and then removing it would be a
  // layout shift for a section that is usually absent anyway.
  if (sponsors === null || sponsors.length === 0) return null;

  const sponsorIds = new Set(sponsors.map((s) => s.id));
  const items = articles.filter((a) => a.sponsorId && sponsorIds.has(a.sponsorId));
  if (items.length === 0) return null;

  return (
    <div className="rail-block">
      <div className="rail-head">
        <div className="kicker meta">SPONSOR WATCH</div>
        <h3 className="rail-title">News from this competition&apos;s sponsors</h3>
        <p className="rail-sub">
          {sponsors.map((s) => s.name).join(' · ')}
        </p>
      </div>
      <div className="report-list">
        {items.slice(0, 6).map((item) => (
          <ReportCard
            key={item.id}
            item={item}
            saved={isBookmarked(item.id)}
            onToggle={() => toggleBookmark(item)}
          />
        ))}
      </div>
    </div>
  );
}
