// ABOUTME: The 11 discipline filter pills, disabled while the Saved tab is open.
// ABOUTME: Pills are square per the zero-radius brand rule; active uses accent, not gold-on-cream.

import { DISCIPLINES } from '../../lib/disciplines';
import type { DisciplineId } from '../../lib/types';

interface Props {
  discipline: DisciplineId;
  setDiscipline: (d: DisciplineId) => void;
  disabled: boolean;
  aiOnly: boolean;
  setAiOnly: (v: boolean) => void;
  /** How many articles in the current discipline carry an AI angle. Shown so
   *  the toggle is never a blind guess that lands on an empty feed. */
  aiCount: number;
}

export function DisciplineBar({
  discipline,
  setDiscipline,
  disabled,
  aiOnly,
  setAiOnly,
  aiCount,
}: Props) {
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

        {/* One more pill, same interaction as the disciplines (brief §3f). It
            filters — it does NOT reorder. Recency stays the primary sort, so a
            delegate's feed never silently rearranges itself. */}
        <button
          className={'pill pill-ai ' + (aiOnly ? 'active' : '')}
          onClick={() => setAiOnly(!aiOnly)}
          disabled={disabled || (aiCount === 0 && !aiOnly)}
          aria-pressed={aiOnly}
          title={
            aiCount === 0
              ? 'No articles with an AI angle in this discipline'
              : `${aiCount} article${aiCount !== 1 ? 's' : ''} with an AI angle`
          }
        >
          AI Angle
          {aiCount > 0 && <span className="count">{aiCount}</span>}
        </button>
      </div>
    </div>
  );
}
