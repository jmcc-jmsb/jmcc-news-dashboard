// ABOUTME: The selected competition's discipline pills, disabled while the Saved tab is open.
// ABOUTME: Pills are square per the zero-radius brand rule; active uses accent, not gold-on-cream.

import { useEffect, useRef } from 'react';
import { disciplinesIn } from '../../lib/disciplines';
import { revealActivePill } from '../../lib/pills';
import { useHeightVar } from '../../lib/use-height-var';
import type { DisciplineId } from '../../lib/types';

interface Props {
  discipline: DisciplineId;
  setDiscipline: (d: DisciplineId) => void;
  /** Only this section's disciplines render. Every id belongs to exactly one
   *  section, so the full 33-pill registry is never shown at once — which is
   *  also what keeps this sticky bar the same height it has always been. */
  competition: string;
  disabled: boolean;
}

export function DisciplineBar({ discipline, setDiscipline, competition, disabled }: Props) {
  const disciplines = disciplinesIn(competition);
  const row = useRef<HTMLDivElement>(null);
  const bar = useHeightVar<HTMLDivElement>('--discipline-bar-h');

  useEffect(() => revealActivePill(row.current), [discipline]);

  return (
    <div className={'discipline-bar ' + (disabled ? 'is-disabled' : '')} ref={bar}>
      <div className="discipline-bar-inner">
        <span className="meta dl-label" id="discipline-label">
          DISCIPLINE
        </span>
        <div className="pills" role="group" aria-labelledby="discipline-label" ref={row}>
          {disciplines.map((d) => (
            <button
              key={d.id}
              className={'pill ' + (d.id === discipline ? 'active' : '')}
              onClick={() => setDiscipline(d.id)}
              disabled={disabled}
              aria-pressed={d.id === discipline}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
