// ABOUTME: The 11 discipline filter pills, disabled while the Saved tab is open.
// ABOUTME: Pills are square per the zero-radius brand rule; active uses accent, not gold-on-cream.

import { DISCIPLINES } from '../../lib/disciplines';
import type { DisciplineId } from '../../lib/types';

interface Props {
  discipline: DisciplineId;
  setDiscipline: (d: DisciplineId) => void;
  disabled: boolean;
}

export function DisciplineBar({ discipline, setDiscipline, disabled }: Props) {
  return (
    <div className={'discipline-bar ' + (disabled ? 'is-disabled' : '')}>
      <div className="discipline-bar-inner">
        <span className="meta dl-label" id="discipline-label">
          DISCIPLINE
        </span>
        <div className="pills" role="group" aria-labelledby="discipline-label">
          {DISCIPLINES.map((d) => (
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
