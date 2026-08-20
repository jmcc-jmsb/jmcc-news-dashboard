// ABOUTME: GET /api/reports?discipline=&limit= — the consulting-report rail for one discipline.
// ABOUTME: Same read path as /api/news against news_reports.

import type { APIRoute } from 'astro';
import { getFeed } from '../../lib/feed-repo';
import { badRequest, canServe, json, notConfigured, parseFeedQuery } from './_shared';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const q = parseFeedQuery(url);
  if ('error' in q) return badRequest(q.error);
  if (!canServe()) return notConfigured();

  try {
    // The rail shows at most 8; asking for more would be wasted transfer.
    const feed = await getFeed('news_reports', q.discipline, Math.min(q.limit, 8), false);
    return json(feed, 200, 300);
  } catch (err) {
    console.error('[api/reports]', err);
    return json({ error: 'Reports unavailable' }, 502);
  }
};
