// ABOUTME: Dashboard control bar below the site Nav — EDITION strip, tabs, theme toggle, bookmark count.
// ABOUTME: What survived the prototype's deleted <Header>; Nav.astro has no notion of any of it.

import type { Tab, Theme } from '../../lib/types';
import { Icon } from './ui/Icon';
import { useHeightVar } from '../../lib/use-height-var';

interface Props {
  /** Built URL of the JMCC shield, optimised by the host page. */
  logoSrc: string;
  theme: Theme;
  setTheme: (t: Theme) => void;
  tab: Tab;
  setTab: (t: Tab) => void;
  bookmarksCount: number;
  /** False until at least one discipline is published (brief §3c). */
  showSpecsTab: boolean;
  /** False until at least one sponsor profile is published. */
  showSponsorsTab: boolean;
}

export function DashboardBar({
  logoSrc,
  theme,
  setTheme,
  tab,
  setTab,
  bookmarksCount,
  showSpecsTab,
  showSponsorsTab,
}: Props) {
  const bar = useHeightVar<HTMLDivElement>('--dash-bar-h');

  return (
    <div className="dash-bar" ref={bar}>
      <div className="dash-bar-inner">
        {/* The site nav was removed deliberately — this is the dashboard, not
            the website. What the nav did still carry was the identification of
            whose product this is, and the shield plus wordmark is the minimum
            that replaces it: the website's own mark, set in the brand display
            face, dashboard-owned.

            It links to the dashboard root, not to wecompete.ca. A brand mark in
            the top-left is read as "home", and here home is this dashboard —
            "/" drops ?tab, ?discipline and ?ai, so it returns to the default
            News Feed from any tab or shared link. The route back to the main
            site is the Footer, which links out in full. */}
        <a className="dash-brand" href="/">
          {/* Decorative: the wordmark beside it already names the product, so
              a second reading of "JMCC" would only be noise to a screen reader. */}
          <img className="dash-brand-logo" src={logoSrc} alt="" width={41} height={36} />
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
          {showSponsorsTab && (
            <button
              className={'nav-link ' + (tab === 'sponsors' ? 'active' : '')}
              onClick={() => setTab('sponsors')}
              aria-current={tab === 'sponsors' ? 'page' : undefined}
            >
              Sponsors
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
