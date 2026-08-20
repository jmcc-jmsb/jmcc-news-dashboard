// ABOUTME: GET /api/news?discipline=&limit=&ai=1 — the article feed for one discipline.
// ABOUTME: Reads Supabase; serves fixtures only when PUBLIC_USE_FIXTURES is explicitly on.

import type { APIRoute } from 'astro';
import { getFeed } from '../../lib/feed-repo';
import { badRequest, canServe, json, notConfigured, parseFeedQuery } from './_shared';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const q = parseFeedQuery(url);
  if ('error' in q) return badRequest(q.error);
  if (!canServe()) return notConfigured();

  try {
    const feed = await getFeed('news_articles', q.discipline, q.limit, q.aiOnly);
    return json(feed, 200, 300);
  } catch (err) {
    console.error('[api/news]', err);
    return json({ error: 'Feed unavailable' }, 502);
  }
};
