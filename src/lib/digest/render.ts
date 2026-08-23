// ABOUTME: Builds one subscriber's digest email — pure, no database and no network.
// ABOUTME: Title/description/URL only, never article bodies; every field is escaped before it reaches HTML.

import { absDate, digestSendLabel } from '../format';
import type { FeedItem } from '../types';

/* Email clients do not resolve CSS custom properties, and half of them strip
   <style> entirely, so brand colour has to be inline hex here. This block is
   the token block for email — the values are copied from @theme in
   global.css and nothing below writes a hex literal of its own.
   When the brand palette changes, change it here too. */
const C = {
  primary: '#680009',
  cream: '#f7f3ec',
  ink: '#000000',
  border: '#95323f',
  gold: '#fabb20',
  muted: '#5e5c5a',
} as const;

/* Unbounded and Montserrat are self-hosted webfonts; email cannot load them,
   so the stack degrades to the reader's system sans. Naming them first still
   picks them up in the handful of clients that have them installed locally. */
const DISPLAY = `'Unbounded', 'Montserrat', Helvetica, Arial, sans-serif`;
const BODY = `'Montserrat', Helvetica, Arial, sans-serif`;

export interface DigestSection {
  disciplineLabel: string;
  items: FeedItem[];
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

/**
 * Escapes before interpolation, always. Titles and descriptions come from
 * third-party RSS feeds — untrusted text we never authored. An unescaped
 * apostrophe is cosmetic; an unescaped `<a href>` in a feed title is an
 * injected link inside an email that appears to come from JMCC.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Only http(s) links survive. A feed could carry `javascript:` or `data:` in
 * its link field, and escaping the text does nothing about the href.
 * Returns null for anything else, and the caller renders that item as plain
 * text rather than dropping it silently.
 */
export function safeUrl(value: string): string | null {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null;
  } catch {
    return null;
  }
}

function itemHtml(item: FeedItem): string {
  const href = safeUrl(item.url);
  const title = escapeHtml(item.title);
  const meta = `${escapeHtml(item.source)} &middot; ${escapeHtml(absDate(item.publishedAt))}`;

  const heading = href
    ? `<a href="${escapeHtml(href)}" style="color:${C.primary};text-decoration:none;font-weight:600;">${title}</a>`
    : `<span style="color:${C.ink};font-weight:600;">${title}</span>`;

  return `
    <tr>
      <td style="padding:0 0 18px 0;font-family:${BODY};font-size:15px;line-height:1.45;">
        ${heading}
        <div style="color:${C.muted};font-size:12px;letter-spacing:0.06em;text-transform:uppercase;padding-top:4px;font-variant-numeric:tabular-nums;">${meta}</div>
      </td>
    </tr>`;
}

function sectionHtml(section: DigestSection): string {
  return `
    <tr>
      <td style="padding:26px 0 12px 0;">
        <div style="font-family:${DISPLAY};font-size:13px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${C.border};border-bottom:2px solid ${C.border};padding-bottom:6px;">
          ${escapeHtml(section.disciplineLabel)}
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding-top:14px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          ${section.items.map(itemHtml).join('')}
        </table>
      </td>
    </tr>`;
}

function itemText(item: FeedItem): string {
  const href = safeUrl(item.url);
  const meta = `${item.source} - ${absDate(item.publishedAt)}`;
  return href ? `* ${item.title}\n  ${meta}\n  ${href}` : `* ${item.title}\n  ${meta}`;
}

/**
 * One subscriber's email. `sections` is already filtered to the disciplines
 * they chose AND to the ones that actually have items — the caller decides not
 * to send at all when that list is empty, because an email whose body is
 * "nothing this week" eleven times over trains people to ignore the next one.
 *
 * `unsubscribeUrl` is required rather than optional. Canada's anti-spam law
 * wants a working unsubscribe in every commercial message, and making the
 * parameter optional is how one code path eventually ships without it.
 */
export function renderDigest(
  sections: DigestSection[],
  unsubscribeUrl: string,
  now: Date = new Date(),
): RenderedEmail {
  const count = sections.reduce((n, s) => n + s.items.length, 0);
  const subject = `JMCC Weekly Digest — ${absDate(now.toISOString())}`;

  /* Never hardcode a local send time (AGENTS.md, Daylight time). digestSendLabel
     derives it from the cron through Intl, so the copy stays true across EST
     and EDT without anyone remembering to change it in March. */
  const cadence = `Sent ${digestSendLabel(now)}.`;

  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:${C.cream};">
  <!-- Preheader: what shows next to the subject in an inbox list. Hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${count} headlines across ${sections.length} discipline${sections.length === 1 ? '' : 's'}.</div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${C.cream};">
    <tr><td align="center" style="padding:28px 16px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;">

        <tr>
          <td style="background:${C.primary};padding:22px 24px;">
            <div style="font-family:${DISPLAY};font-size:18px;font-weight:800;letter-spacing:0.04em;color:${C.gold};">JMCC WEEKLY DIGEST</div>
            <div style="font-family:${BODY};font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${C.cream};padding-top:6px;">Ambient awareness, not case prep</div>
          </td>
        </tr>

        <tr><td style="padding:0 24px 24px 24px;background:#ffffff;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            ${sections.map(sectionHtml).join('')}
          </table>
        </td></tr>

        <tr>
          <td style="padding:18px 24px;background:${C.ink};font-family:${BODY};font-size:12px;line-height:1.6;color:${C.cream};">
            <div>${escapeHtml(cadence)} Headlines link out to their publishers; JMCC hosts no article text.</div>
            <div style="padding-top:10px;">
              <a href="${escapeHtml(unsubscribeUrl)}" style="color:${C.gold};text-decoration:underline;">Unsubscribe</a>
            </div>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    'JMCC WEEKLY DIGEST',
    absDate(now.toISOString()),
    '',
    ...sections.flatMap((s) => [s.disciplineLabel.toUpperCase(), ...s.items.map(itemText), '']),
    cadence,
    'Headlines link out to their publishers; JMCC hosts no article text.',
    '',
    `Unsubscribe: ${unsubscribeUrl}`,
  ].join('\n');

  return { subject, html, text };
}
