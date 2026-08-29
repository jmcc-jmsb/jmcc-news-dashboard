// ABOUTME: One horizontal bar chart comparing a single metric across sponsors — CSS widths, no SVG, no library.
// ABOUTME: Bars are a percentage of the largest value, so the chart is honest only for magnitudes from zero.

import { num } from '../../../lib/format';
import type { MetricComparison } from '../../../lib/sponsors';

interface Props {
  comparison: MetricComparison;
}

/**
 * Deliberately not a charting library and deliberately not SVG.
 *
 * A ranked bar chart is a list with one number scaled to a width, and as plain
 * markup it inherits the theme tokens, the focus ring, and tabular-nums for
 * free — an <svg> would need all three re-specified. It also reads correctly to
 * a screen reader as "Northwind 4.1" without an aria-label restating the chart.
 *
 * ponytail: widths are a share of the maximum, which assumes non-negative
 * magnitudes. Everything in `metrics` is one by construction (lib/sponsors
 * keeps founding years out). If a signed metric ever lands here, a diverging
 * axis is the upgrade — not a clamp.
 */
export function MetricBars({ comparison }: Props) {
  const max = Math.max(...comparison.bars.map((b) => b.value));

  return (
    <figure className="chart">
      <figcaption className="chart-head">
        <span className="kicker meta">{comparison.label}</span>
        {comparison.unit && <span className="meta chart-unit">{comparison.unit}</span>}
      </figcaption>
      <ul className="bar-list">
        {comparison.bars.map((b) => (
          <li key={b.id} className="bar-row">
            <span className="bar-name">{b.name}</span>
            <span className="bar-track">
              <span
                className="bar-fill"
                style={{ width: `${max > 0 ? (b.value / max) * 100 : 0}%` }}
              />
            </span>
            <span className="bar-value">{num(b.value)}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
