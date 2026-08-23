// ABOUTME: GET/POST /api/digest/unsubscribe?token= — one click, no confirmation step, no login.
// ABOUTME: Resolves by uuid token because an email-keyed link would let anyone unsubscribe anyone.

import type { APIRoute } from 'astro';
import { isDatabaseConfigured } from '../../../lib/feed-repo';
import { isUuid, unsubscribeByToken } from '../../../lib/digest/subscribers';

export const prerender = false;

/* Plain HTML, no layout import. This page is opened from an email client by
   someone who wants out — it must render with no JavaScript, no fonts to
   fetch, and no dependency on the dashboard shell booting. Colours are inline
   for the same reason the email's are; see the token block in digest/render.ts. */
function page(title: string, message: string, status: number): Response {
  return new Response(
    `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title></head>
<body style="margin:0;background:#f7f3ec;color:#000000;font-family:Helvetica,Arial,sans-serif;">
  <div style="max-width:520px;margin:12vh auto;padding:0 24px;">
    <div style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#95323f;font-weight:700;">JMCC Weekly Digest</div>
    <h1 style="font-size:24px;line-height:1.25;margin:12px 0 8px 0;">${title}</h1>
    <p style="font-size:15px;line-height:1.6;color:#5e5c5a;margin:0 0 24px 0;">${message}</p>
    <a href="https://www.wecompete.ca" style="font-size:13px;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;color:#680009;">Back to JMCC</a>
  </div>
</body></html>`,
    { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } },
  );
}

/**
 * GET is what a person clicking the footer link sends. POST is what a mail
 * client's own unsubscribe button sends for RFC 8058 one-click, which the
 * digest's List-Unsubscribe-Post header claims — so both have to work, and
 * neither may require a confirmation click.
 */
const handle: APIRoute = async ({ url }) => {
  const token = url.searchParams.get('token') ?? '';

  // Checked before the query: Postgres raises on a malformed uuid comparison,
  // so an unvalidated token turns a truncated link into a 500.
  if (!isUuid(token)) {
    return page(
      'That link is not valid',
      'The unsubscribe link looks incomplete. Copy the whole link from the email, or reply to it and we will remove you by hand.',
      400,
    );
  }

  if (!isDatabaseConfigured()) {
    console.error('[api/digest/unsubscribe] Supabase is not configured.');
    return page('Something went wrong', 'We could not process that right now. Please try again shortly.', 503);
  }

  try {
    await unsubscribeByToken(token);
  } catch (err) {
    console.error('[api/digest/unsubscribe]', err);
    return page('Something went wrong', 'We could not process that right now. Please try again shortly.', 502);
  }

  /* The same page whether a row was deleted or the token was already gone.
     A second click on the same link is a normal thing to do, and "you were not
     subscribed" reads like a failure — worse, the difference tells a stranger
     holding a token whether it is live. */
  return page(
    'You are unsubscribed',
    'You will not receive the weekly digest again. The dashboard itself stays open to everyone, no signup needed.',
    200,
  );
};

export const GET = handle;
export const POST = handle;
