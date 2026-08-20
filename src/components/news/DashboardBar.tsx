// ABOUTME: Dashboard control bar below the site Nav — EDITION strip, tabs, theme toggle, bookmark count.
// ABOUTME: What survived the prototype's deleted <Header>; Nav.astro has no notion of any of it.

import type { Tab, Theme } from '../../lib/types';
import { Icon } from './ui/Icon';

interface Props {
  theme: Theme;
  setTheme: (t: Theme) => void;
  tab: Tab;
  setTab: (t: Tab) => void;
  bookmarksCount: number;
  /** False until at least one discipline is published (brief §3c). */
  showSpecsTab: boolean;
  /** Rendered on the client only, so the date is the reader's own. */
  edition: { label: string; dateStr: string };
}

export function DashboardBar({
  theme,
  setTheme,
  tab,
  setTab,
  bookmarksCount,
  showSpecsTab,
  edition,
}: Props) {
  return (
    <div className="dash-bar">
      {/* The EDITION strip is a dashboard element, not site chrome, so it stays
          (brief §7) — repositioned below the imported Nav rather than above it. */}
      <div className="header-meta">
        <div className="header-meta-inner">
          <span className="meta">
            EDITION №{edition.label} · {edition.dateStr}
          </span>
          <span className="meta">JMCC INTERNAL · PUBLIC</span>
        </div>
      </div>
      <div className="dash-bar-inner">
        {/* The site nav was removed deliberately — this is the dashboard, not
            the website. What the nav did still carry, though, was the only
            identification of whose product this is and the only route back to
            the main site. This wordmark is the minimum that replaces both: set
            in the brand display face, dashboard-owned, one link out. */}
        <a className="dash-brand" href="https://www.wecompete.ca">
          JMCC <span className="dash-brand-sub">News &amp; Resources</span>
        </a>
        <nav className="nav" aria-label="Dashboard sections">
          <button
            className={'nav-link ' + (tab === 'news' ? 'active' : '')}
            onClick={() => setTab('news')}
            aria-current={tab === 'news' ? 'page' : undefined}
          >
            News Feed
          </button>
          {showSpecsTab && (
            <button
              className={'nav-link ' + (tab === 'specs' ? 'active' : '')}
              onClick={() => setTab('specs')}
              aria-current={tab === 'specs' ? 'page' : undefined}
            >
              Technical Specs
            </button>
          )}
          <button
            className={'nav-link ' + (tab === 'saved' ? 'active' : '')}
            onClick={() => setTab('saved')}
            aria-current={tab === 'saved' ? 'page' : undefined}
          >
            Saved{' '}
            {bookmarksCount > 0 && (
              <span className="badge">
                {bookmarksCount}
                <span className="sr-only"> saved items</span>
              </span>
            )}
          </button>
        </nav>
        <div className="header-actions">
          <button
            className="icon-btn"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
          >
            {theme === 'light' ? Icon.moon : Icon.sun}
          </button>
        </div>
      </div>
    </div>
  );
}
