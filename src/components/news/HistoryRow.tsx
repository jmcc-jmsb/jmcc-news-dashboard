// ABOUTME: One case-history entry with inline editing of notes and comma-separated tags.
// ABOUTME: Edit state is local; only Save lifts changes, so Cancel restores the stored values.

import { useState } from 'react';
import type { HistoryItem } from '../../lib/types';
import { absDate } from '../../lib/format';
import { highlight } from '../../lib/highlight';
import { Icon } from './ui/Icon';

interface Props {
  item: HistoryItem;
  q: string;
  remove: (id: string) => void;
  update: (id: string, fields: Partial<HistoryItem>) => void;
}

export function HistoryRow({ item, q, remove, update }: Props) {
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(item.notes || '');
  const [tagInput, setTagInput] = useState((item.tags || []).join(', '));

  const save = () => {
    const tags = tagInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    update(item.id, { notes, tags });
    setEditing(false);
  };

  const cancel = () => {
    setEditing(false);
    setNotes(item.notes || '');
    setTagInput((item.tags || []).join(', '));
  };

  return (
    <article className="card history-card">
      <div className="hist-head">
        <div className="hist-head-meta">
          <span className="meta-source">{item.source}</span>
          <span className="meta-dot">·</span>
          <span className={'type-chip type-' + item.type}>{item.type}</span>
          <span className="discipline-tag">{item.discipline}</span>
          <time className="meta meta-date" dateTime={item.savedAt}>
            SAVED {absDate(item.savedAt)}
          </time>
        </div>
        <button
          className="icon-btn"
          onClick={() => remove(item.id)}
          aria-label={`Remove from Case History — ${item.title}`}
        >
          {Icon.close}
        </button>
      </div>
      <h3 className="card-title">
        <a href={item.url} target="_blank" rel="noopener noreferrer">
          {highlight(item.title, q)}
        </a>
      </h3>

      {editing ? (
        <div className="hist-editor">
          <label className="field">
            <span className="field-label meta">NOTES</span>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Relevant to Q3 cost-cutting scenario"
            />
          </label>
          <label className="field">
            <span className="field-label meta">TAGS (comma-separated)</span>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="finance, DCF, M&amp;A"
            />
          </label>
          <div className="hist-actions">
            <button className="text-btn" onClick={cancel}>
              Cancel
            </button>
            <button className="primary-btn small" onClick={save}>
              Save
            </button>
          </div>
        </div>
      ) : (
        <div className="hist-body">
          {item.notes ? (
            <p className="hist-notes">{highlight(item.notes, q)}</p>
          ) : (
            <p className="hist-notes empty-notes">No notes yet.</p>
          )}
          {(item.tags || []).length > 0 && (
            <div className="hist-tags">
              {item.tags.map((t) => (
                <span key={t} className="tag meta">
                  #{highlight(t, q)}
                </span>
              ))}
            </div>
          )}
          <div className="hist-actions">
            <button className="text-btn" onClick={() => setEditing(true)}>
              Edit notes &amp; tags
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
