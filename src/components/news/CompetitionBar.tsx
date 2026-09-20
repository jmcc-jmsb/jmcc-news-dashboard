// ABOUTME: The four competition sections — JDC/JDCC, SMNG, FO, HM — above the discipline pills.
// ABOUTME: Selecting one swaps the entire discipline set below it; sections never share a discipline.

import { useEffect, useRef } from 'react';
import { COMPETITIONS, eventsCovering } from '../../lib/competitions';
import { revealActivePill } from '../../lib/pills';

interface Props {
  competition: string;
  setCompetition: (id: string) => void;
  /** Only used to narrow the events strip in a section of many events. */
  discipline: string;
  disabled: boolean;
}

export function CompetitionBar({ competition, setCompetition, discipline, disabled }: Props) {
  const active = COMPETITIONS.find((c) => c.id === competition);

  /* Two events fit on the line and say something the pills do not: JDC and
     JDCC share a section, so a delegate needs to see both. The International
     section is six events whose pills ARE the events — listing all six in full
     wrapped to four lines and pushed the pills into three rows — so there the
     strip follows the selection instead. */
  const events = active
    ? active.events.length > 2
      ? eventsCovering(active, discipline)
      : active.events
    : [];
  const row = useRef<HTMLDivElement>(null);

  useEffect(() => revealActivePill(row.current), [competition]);

  return (
    <div className={'competition-bar ' + (disabled ? 'is-disabled' : '')}>
      <div className="competition-bar-inner">
        <span className="meta dl-label" id="competition-label">
          COMPETITION
        </span>
        <div className="pills" role="group" aria-labelledby="competition-label" ref={row}>
          {COMPETITIONS.map((c) => (
            <button
              key={c.id}
              className={'pill pill-comp ' + (c.id === competition ? 'active' : '')}
              onClick={() => setCompetition(c.id)}
              disabled={disabled}
              aria-pressed={c.id === competition}
              title={c.blurb}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Where the delegation actually travels. JDC and JDCC are two events
            in one section, so this is the only place the distinction shows. */}
        {events.length > 0 && (
          <span className="competition-events meta">
            {events.map((e, i) => (
              <span key={e.slug}>
                {i > 0 && ' · '}
                {e.url ? (
                  <a href={e.url} target="_blank" rel="noopener noreferrer">
                    {e.name}
                  </a>
                ) : (
                  e.name
                )}{' '}
                {e.location}
              </span>
            ))}
          </span>
        )}
      </div>
    </div>
  );
}
