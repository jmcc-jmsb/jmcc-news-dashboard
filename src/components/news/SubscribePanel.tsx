// ABOUTME: Weekly digest signup — email plus a per-discipline opt-in list.
// ABOUTME: Sprint 0 is UI only; POST to /api/digest/subscribe lands in Sprint 4.

import { useState } from 'react';
import { DISCIPLINES } from '../../lib/disciplines';
import { digestSendLabel } from '../../lib/format';
import type { DisciplineId } from '../../lib/types';
import { Icon } from './ui/Icon';

export function SubscribePanel() {
  const [email, setEmail] = useState('');
  const [selected, setSelected] = useState<Set<DisciplineId>>(
    () => new Set(DISCIPLINES.map((d) => d.id)),
  );
  const [submitted, setSubmitted] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const toggle = (id: DisciplineId) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  if (submitted) {
    return (
      <div className="rail-block subscribe">
        <div className="rail-head">
          <div className="kicker meta">SUBSCRIPTION CONFIRMED</div>
        </div>
        <div className="subscribe-success">
          <div className="check-circle">{Icon.check}</div>
          <p>
            Digest scheduled for <strong>{digestSendLabel()}</strong>. We&apos;ll send{' '}
            <strong>{selected.size}</strong> discipline{selected.size !== 1 ? 's' : ''} to{' '}
            <em>{email}</em>.
          </p>
          <button
            className="text-btn"
            onClick={() => {
              setSubmitted(false);
              setEmail('');
            }}
          >
            Manage subscription
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rail-block subscribe">
      <div className="rail-head">
        <div className="kicker meta">WEEKLY DIGEST</div>
        <h3 className="rail-title">Monday mornings, in your inbox.</h3>
        <p className="rail-sub">Top headlines &amp; consulting reports for the disciplines you pick.</p>
      </div>
      {/* Inline so the event type is inferred from the JSX prop. React 19
          deprecates the FormEvent type export, and naming it here would be the
          only reason this file needed it. */}
      <form
        className="subscribe-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!email || !email.includes('@')) return;
          // Sprint 4 replaces this with a POST to /api/digest/subscribe, which
          // writes to news_digest_subscribers with the secret key. That table
          // has no public read policy whatsoever (brief §10).
          setSubmitted(true);
        }}
      >
        <label className="field">
          <span className="field-label meta">EMAIL</span>
          <input
            type="email"
            required
            placeholder="you@johnmolson.ca"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <div className="field">
          <button
            type="button"
            className="disclosure"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-controls="discipline-checks"
          >
            <span className="field-label meta">DISCIPLINES ({selected.size})</span>
            <span className="meta">{expanded ? 'collapse' : 'edit'}</span>
          </button>
          {expanded && (
            <div className="discipline-checks" id="discipline-checks">
              {DISCIPLINES.map((d) => (
                <label key={d.id} className={'check ' + (selected.has(d.id) ? 'checked' : '')}>
                  <input
                    type="checkbox"
                    checked={selected.has(d.id)}
                    onChange={() => toggle(d.id)}
                  />
                  <span className="box">{selected.has(d.id) && Icon.check}</span>
                  <span>{d.label}</span>
                </label>
              ))}
            </div>
          )}
          {!expanded && (
            <div className="discipline-summary meta">
              {selected.size === DISCIPLINES.length
                ? 'All 11 disciplines'
                : Array.from(selected)
                    .slice(0, 3)
                    .map((id) => DISCIPLINES.find((x) => x.id === id)?.label)
                    .join(', ') + (selected.size > 3 ? ` +${selected.size - 3}` : '')}
            </div>
          )}
        </div>

        <button type="submit" className="primary-btn">
          Subscribe
        </button>
        <p className="fine-print meta">No account required · unsubscribe anytime</p>
      </form>
    </div>
  );
}
