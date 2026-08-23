// ABOUTME: Weekly digest signup — email plus a per-discipline opt-in list.
// ABOUTME: Posts to /api/digest/subscribe — the browser cannot write that table itself, it has no read policy.

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
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        onSubmit={async (e) => {
          e.preventDefault();
          if (pending) return;
          setError(null);
          setPending(true);

          /* The route re-validates all of this. The checks below are for the
             reader's benefit only — never treat a client-side guard as the
             one that matters, the endpoint is public. */
          try {
            const res = await fetch('/api/digest/subscribe', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ email, disciplines: Array.from(selected) }),
            });

            if (!res.ok) {
              // The route's message is written for a delegate and never names
              // an environment variable, so it can be shown as-is.
              const body = await res.json().catch(() => null);
              setError(body?.message ?? 'We could not save that subscription. Please try again.');
              return;
            }

            setSubmitted(true);
          } catch {
            // Offline, or the request never left. Distinct from a 4xx/5xx:
            // nothing was written, so retrying is the right advice.
            setError('That did not go through. Check your connection and try again.');
          } finally {
            setPending(false);
          }
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

        {/* aria-live so a screen reader hears the failure — the message
            appears without the focus ever moving. */}
        {error && (
          <p className="subscribe-error meta" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="primary-btn" disabled={pending || selected.size === 0}>
          {pending ? 'Subscribing…' : 'Subscribe'}
        </button>
        <p className="fine-print meta">No account required · unsubscribe anytime</p>
      </form>
    </div>
  );
}
