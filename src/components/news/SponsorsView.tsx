// ABOUTME: Sponsor Tracker — an overview of competition sponsors, then one profile card each.
// ABOUTME: Renders content only for 'published' sponsors; content comes from src/content/sponsors.json.

import { num } from '../../lib/format';
import {
  IN_DEVELOPMENT_COUNT,
  PUBLISHED_SPONSORS,
  USING_SAMPLE_SPONSORS,
  metricComparisons,
} from '../../lib/sponsors';
import { Icon } from './ui/Icon';
import { MetricBars } from './ui/MetricBars';
import { SampleDataBanner } from './ui/SampleDataBanner';

/** The host of a URL, for a source link that does not run off the card. */
function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    // The schema validates these with z.url() at build time, so this is
    // unreachable in practice — but a thrown URL parse would blank the tab.
    return url;
  }
}

export function SponsorsView() {
  const sponsors = PUBLISHED_SPONSORS;
  const comparisons = metricComparisons();
  const sectors = new Set(sponsors.map((s) => s.sector));

  /* This tab is hidden entirely while nothing is published, so reaching here
     with an empty list means a stale ?tab=sponsors URL. Say so plainly rather
     than rendering an overview of nothing. */
  if (sponsors.length === 0) {
    return (
      <div className="empty empty-large">
        <div className="kicker meta">SPONSOR TRACKER</div>
        <h4>No sponsor profiles are published yet</h4>
        <p>
          Company profiles appear here once sponsorship is confirmed and the research is
          reviewed. No placeholder companies are shown in the meantime.
        </p>
      </div>
    );
  }

  return (
    <div className="sponsors">
      {USING_SAMPLE_SPONSORS && <SampleDataBanner kind="sponsors" />}

      <div className="section-head">
        <div>
          <div className="kicker meta">SPONSOR TRACKER</div>
          <h2 className="section-title">Competition Sponsors</h2>
          <p className="section-sub">
            {sponsors.length} compan{sponsors.length !== 1 ? 'ies' : 'y'} ·{' '}
            {sectors.size} sector{sectors.size !== 1 ? 's' : ''}
            {IN_DEVELOPMENT_COUNT > 0 &&
              ` · ${IN_DEVELOPMENT_COUNT} more in development`}
          </p>
        </div>
      </div>

      {/* Only metrics two or more sponsors both report, in the same unit, reach
          this section — so the overview is empty until there is something real
          to compare, rather than a row of single bars. */}
      {comparisons.length > 0 && (
        <section className="sponsor-overview" aria-label="Sponsor comparison">
          <div className="chart-grid">
            {comparisons.map((c) => (
              <MetricBars key={`${c.label} ${c.unit ?? ''}`} comparison={c} />
            ))}
          </div>
        </section>
      )}

      {sponsors.map((s) => (
        <article key={s.id} className="sponsor-card">
          <header className="sponsor-head">
            <div>
              <h3 className="sponsor-name">{s.name}</h3>
              <p className="sponsor-meta meta">
                {s.sector} · {s.hq}
                {s.founded && ` · Founded ${s.founded}`}
              </p>
            </div>
            <a
              className="ghost-btn"
              href={s.website}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>Website</span>
              {Icon.external}
            </a>
          </header>

          <p className="sponsor-summary">{s.summary}</p>

          {s.competitions.length > 0 && (
            <ul className="sponsor-comps" aria-label="Competitions sponsored">
              {s.competitions.map((c) => (
                <li key={c} className="badge-flat meta">
                  {c}
                </li>
              ))}
            </ul>
          )}

          {s.metrics.length > 0 && (
            <div className="stat-row">
              {s.metrics.map((m) => (
                <a
                  key={m.label}
                  className="stat-tile"
                  href={m.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={m.note ?? `Source: ${hostOf(m.source)}`}
                >
                  <span className="stat-value">{num(m.value)}</span>
                  <span className="stat-label meta">
                    {m.label}
                    {m.unit && ` (${m.unit})`}
                  </span>
                  <span className="stat-source meta">{hostOf(m.source)}</span>
                </a>
              ))}
            </div>
          )}

          <div className="sponsor-cols">
            {s.goals.length > 0 && (
              <section>
                <h4 className="spec-h">
                  <span className="meta">01</span>Stated Goals
                </h4>
                <ul className="spec-list">
                  {s.goals.map((g, i) => (
                    <li key={g}>
                      <span className="meta spec-idx">G{String(i + 1).padStart(2, '0')}</span>
                      {g}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {s.values.length > 0 && (
              <section>
                <h4 className="spec-h">
                  <span className="meta">02</span>Stated Values
                </h4>
                <ul className="spec-list">
                  {s.values.map((v, i) => (
                    <li key={v}>
                      <span className="meta spec-idx">V{String(i + 1).padStart(2, '0')}</span>
                      {v}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* Every figure above is only true as of a date, and a delegate
              quoting one in a pitch needs to be able to say where it came
              from. The footer carries both. */}
          <footer className="sponsor-foot">
            <span className="meta">FIGURES AS OF {s.asOf}</span>
            {s.sources.length > 0 && (
              <span className="sponsor-sources meta">
                Sources:{' '}
                {s.sources.map((url, i) => (
                  <span key={url}>
                    {i > 0 && ' · '}
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      {hostOf(url)}
                    </a>
                  </span>
                ))}
              </span>
            )}
          </footer>
        </article>
      ))}
    </div>
  );
}
