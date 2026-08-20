// ABOUTME: GET /api/sponsors — active sponsors only, for the Sponsor Watch section.
// ABOUTME: Returns an empty list rather than an error when there are none; the UI hides the section.

import type { APIRoute } from 'astro';
import { getActiveSponsors } from '../../lib/feed-repo';
import { json } from './_shared';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const sponsors = await getActiveSponsors();

    // An empty list is the expected state until the owner adds real sponsors
    // (brief §3d), so this is a 200 with [] rather than a 503. There is no
    // sample fallback here on purpose: fabricating sponsors would invent
    // named commercial relationships, which is worse than inventing headlines.
    return json({ sponsors }, 200, 300);
  } catch (err) {
    console.error('[api/sponsors]', err);
    return json({ sponsors: [], error: 'Sponsors unavailable' }, 502);
  }
};
