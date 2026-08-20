// ABOUTME: Client hook that fetches a discipline's feed from /api/news or /api/reports.
// ABOUTME: Distinguishes loading, empty, and unavailable — an outage must never look like a quiet day.

import { useEffect, useState } from 'react';
import type { FeedItem } from './types';

export type FeedState =
  | { status: 'loading' }
  | { status: 'ready'; items: FeedItem[]; origin: 'database' | 'sample'; lastIngestedAt: string | null }
  /* Distinct from an empty 'ready'. An empty feed is a fact about the news; an
     unavailable one is a fact about us, and conflating them is how an outage
     goes unnoticed for a week. */
  | { status: 'unavailable'; reason: string };

interface Options {
  endpoint: '/api/news' | '/api/reports';
  discipline: string;
  aiOnly?: boolean;
  limit?: number;
  /** Bump to refetch — the Refresh button re-queries our own API, never an
   *  upstream news API (brief §10). */
  refreshKey?: number;
}

export function useFeed({
  endpoint,
  discipline,
  aiOnly = false,
  limit = 24,
  refreshKey = 0,
}: Options): FeedState {
  const [state, setState] = useState<FeedState>({ status: 'loading' });

  useEffect(() => {
    // Abort on unmount and on a fast discipline switch, so a slow earlier
    // response cannot land after a newer one and show the wrong feed.
    const ac = new AbortController();
    setState({ status: 'loading' });

    const params = new URLSearchParams({ discipline, limit: String(limit) });
    if (aiOnly) params.set('ai', '1');

    fetch(`${endpoint}?${params}`, { signal: ac.signal })
      .then(async (res) => {
        if (!res.ok) {
          /* The server's message names environment variables — useful to
             whoever is deploying this, meaningless and slightly alarming to a
             delegate. It goes to the console; the reader gets plain English. */
          const body = await res.json().catch(() => ({}));
          if (body?.message) console.warn('[feed]', body.message);
          setState({
            status: 'unavailable',
            reason:
              res.status === 503
                ? 'The news feed is not connected yet. It will appear here once it goes live.'
                : 'The feed could not be loaded just now. Please try again in a moment.',
          });
          return;
        }
        const body = await res.json();
        setState({
          status: 'ready',
          items: body.items ?? [],
          origin: body.origin ?? 'database',
          lastIngestedAt: body.lastIngestedAt ?? null,
        });
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        setState({ status: 'unavailable', reason: 'The feed could not be reached.' });
      });

    return () => ac.abort();
  }, [endpoint, discipline, aiOnly, limit, refreshKey]);

  return state;
}
