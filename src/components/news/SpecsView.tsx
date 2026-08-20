// ABOUTME: Technical Specs — three sections (frameworks, metrics, sources) with a scrollspy TOC.
// ABOUTME: Renders content only for 'published' disciplines; draft/review get an in-development state.

import { useEffect, useMemo, useRef, useState } from 'react';
import type { DisciplineId } from '../../lib/types';
import { labelFor } from '../../lib/disciplines';
import { specFor } from '../../lib/specs';

const SECTIONS = [
  ['frameworks', 'Key Frameworks'],
  ['metrics', 'Key Metrics'],
  ['sources', 'Recommended Sources'],
] as const;

type SectionKey = (typeof SECTIONS)[number][0];

interface Props {
  discipline: DisciplineId;
}

export function SpecsView({ discipline }: Props) {
  const spec = specFor(discipline);
  const label = labelFor(discipline);
  const [active, setActive] = useState<SectionKey>('frameworks');

  /* The prototype built its refs in an object literal — `{ frameworks: useRef(),
     … }` — and its scrollspy effect closed over that literal, which is a new
     object every render and so can never satisfy exhaustive-deps.

     It also placed `if (!spec) return null` between those useRef calls and the
     useEffect below, so a discipline with no spec rendered a different number
     of hooks than one with a spec. That is a rules-of-hooks violation, not just
     a lint warning: switching between the two orders would have thrown. One
     ref holding a map fixes both — the ref identity is stable, and every hook
     now runs before any early return. */
  const sectionRefs = useRef<Partial<Record<SectionKey, HTMLElement | null>>>({});

  const isPublished = spec?.status === 'published';

  useEffect(() => {
    if (!isPublished) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          const key = (Object.keys(sectionRefs.current) as SectionKey[]).find(
            (k) => sectionRefs.current[k] === en.target,
          );
          if (key) setActive(key);
        });
      },
      { rootMargin: '-30% 0px -60% 0px', threshold: 0 },
    );
    Object.values(sectionRefs.current).forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [discipline, isPublished]);

  const scrollTo = (key: SectionKey) => {
    setActive(key);
    const el = sectionRefs.current[key];
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 90;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  const items = useMemo(
    () => ({
      frameworks: spec?.frameworks ?? [],
      metrics: spec?.metrics ?? [],
      sources: spec?.sources ?? [],
    }),
    [spec],
  );

  /* draft and review render this, never placeholder bullets (AGENTS.md). An
     empty section is the correct and expected state until the owner's coach
     consultation lands. */
  if (!isPublished) {
    return (
      <div className="empty empty-large">
        <div className="kicker meta">TECHNICAL SPECS</div>
        <h4>{label} specs are still in development</h4>
        <p>
          Discipline coaches are drafting this content. It appears here as soon as it is
          reviewed and published — no placeholder material is shown in the meantime.
        </p>
      </div>
    );
  }

  return (
    <div className="specs-layout">
      <aside className="specs-nav">
        <div className="kicker meta">TECHNICAL SPECS</div>
        <h2 className="section-title">{label}</h2>
        <p className="section-sub">Reference material maintained by the JMCC technology team.</p>
        <nav className="spec-toc" aria-label="Specs sections">
          {SECTIONS.map(([k, t], i) => (
            <button
              key={k}
              className={'spec-toc-link ' + (active === k ? 'active' : '')}
              onClick={() => scrollTo(k)}
              aria-current={active === k ? 'true' : undefined}
            >
              <span className="meta toc-num">{String(i + 1).padStart(2, '0')}</span>
              <span>{t}</span>
            </button>
          ))}
        </nav>
      </aside>

      <article className="specs-body">
        <section
          ref={(el) => {
            sectionRefs.current.frameworks = el;
          }}
          id="frameworks"
        >
          <h3 className="spec-h">
            <span className="meta">01</span>Key Frameworks
          </h3>
          <ul className="spec-list">
            {items.frameworks.map((f, i) => (
              <li key={f}>
                <span className="meta spec-idx">F{String(i + 1).padStart(2, '0')}</span>
                {f}
              </li>
            ))}
          </ul>
        </section>

        <section
          ref={(el) => {
            sectionRefs.current.metrics = el;
          }}
          id="metrics"
        >
          <h3 className="spec-h">
            <span className="meta">02</span>Key Metrics
          </h3>
          <div className="metric-grid">
            {items.metrics.map((m, i) => (
              <div key={m} className="metric-chip">
                <span className="meta spec-idx">M{String(i + 1).padStart(2, '0')}</span>
                <span>{m}</span>
              </div>
            ))}
          </div>
        </section>

        <section
          ref={(el) => {
            sectionRefs.current.sources = el;
          }}
          id="sources"
        >
          <h3 className="spec-h">
            <span className="meta">03</span>Recommended Sources
          </h3>
          <ul className="sources-list">
            {items.sources.map((s, i) => (
              <li key={s}>
                <span className="meta spec-idx">{String(i + 1).padStart(2, '0')}</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </section>
      </article>
    </div>
  );
}
