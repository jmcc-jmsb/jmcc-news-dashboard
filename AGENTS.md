# JMCC News Dashboard

Public, English-language news dashboard keeping JMCC delegates current on trends
in each competition discipline. Astro 7 + React islands, SSR on Vercel, Supabase
for data. Companion to `jmcc-website` (static, cPanel) and `jmcc-portal`
(authenticated, Vercel).

`CLAUDE.md` is a symlink to this file. Edit this one.

## Conventions
- Every source file opens with two `// ABOUTME:` comment lines describing its purpose.
  This is the convention used across the jmcc-website repo. Match it.
- Never use raw hex colors in components. All colors come from the @theme tokens
  in global.css or the CSS variables in dashboard.css.
- No rounded corners. The JMCC brand uses sharp corners everywhere.
- Two typefaces only: Unbounded (display) and Montserrat (everything else).
  There is no monospace face. Use font-variant-numeric: tabular-nums for
  aligned digits — Montserrat's default figures are proportional.
- Unbounded is display-only — never for body copy or dense lists.
- Labels, buttons, and eyebrows are uppercase Montserrat 600 with wide tracking.
- English only. No i18n in dashboard content or UI strings.
- Ingest English-language sources only.

## Scope discipline
- The news feed is for staying current on trends — a headline and a link.
  It is not a research or case-prep tool. Don't grow it into one.
- Case prep depth belongs to Technical Specs and Case History, not here.

## Accessibility
- WCAG AA is a product requirement, not a nice-to-have.
- gold and sand are DARK-BACKGROUND-ONLY tokens. Never as text on cream.
- Every interactive element gets a gold focus ring: outline 2px, offset 2px.
- Preserve every aria-* attribute from the prototype.

## Technical Specs content
- src/content/specs.json is CONTENT, not code. Never edit its values to make
  a test pass or to fill a gap. The owner supplies the real content.
- Every discipline has a status: draft | review | published.
  Only "published" renders. draft/review show an in-development empty state.
- Never render placeholder bullets. An empty section is correct and expected.
- If no discipline is published, the Technical Specs tab hides itself.

## Sponsor tracking
- Sponsors are competition-scoped and ship empty until the owner adds real
  ones. Never fabricate sponsor data. The Sponsor Watch section hides itself
  when there are zero active sponsors — don't render an empty rail.

## Topic tuning
- news_discipline_topics is a shared Supabase table, potentially also written to
  by the separate Delegate Portal project. Treat it as external data the
  dashboard reads for ingest keywords — don't assume the dashboard owns it.

## AI relevance
- ai_relevant is set at ingest via keyword match, never guessed at render time.
- Default UX is badge + filter toggle. Do not silently reorder the feed
  without an explicit decision from the owner.

## Do not change
- localStorage keys: jmcc_theme, jmcc_bookmarks, jmcc_case_history
- The bookmark object shape — it maps 1:1 onto the Supabase schema
- The 11 discipline ids
- The h() hashing function — it is the ingest dedupe key
- The specs page has THREE sections: frameworks, metrics, sources.
  Overview and Glossary were cut deliberately. Do not re-add them.

## Ingest schedule
- **Ingest runs ONCE PER DAY**, `0 11 * * *`. This is an owner decision, not an
  oversight: the Vercel account is on the Hobby plan, which allows at most one
  cron run per day. Brief §11's four-run schedule is superseded.
- Adding a second daily run does not degrade gracefully — Vercel **rejects the
  deploy outright**. Do not "fix" a stale feed by adding runs.
- Budget the credit spend against one run, not four (brief §10 assumed four).
- The weekly digest, `0 13 * * 1`, is unaffected — weekly is within the limit.
- Reasoning and the alternatives are in docs/CRON_OPTIONS.md.

## Daylight time
- Vercel cron is UTC-only. `0 11 * * *` = 07:00 EDT / 06:00 EST; the weekly
  digest `0 13 * * 1` = 09:00 EDT / 08:00 EST. Brief §11 states this drift
  backwards — the schedule hits 8:00 AM in winter, which is launch season.
- **Never hardcode a local send time in UI or email copy.** Call
  `digestSendLabel()` from lib/format.ts; it derives the local time from the
  cron via Intl, so it stays true across both offsets. Tests pin both.
- The usual "schedule hourly and no-op" DST fix needs many runs per day and is
  therefore impossible on Hobby. Don't reach for it without a plan change.

## Shared Supabase project with jmcc-portal
This repo and `jmcc-portal` share one Supabase project. The Portal was there
first and owns `competitions`, `disciplines`, `profiles`, `teams`, and the
`team_*` membership tables.

- **Every table this repo creates is prefixed `news_`.** `news_articles`,
  `news_reports`, `news_sources`, `news_sponsors`, `news_digest_subscribers`,
  `news_discipline_topics`. The prefix is uniform, including on tables that do
  not collide today — a rule with remembered exceptions is worse than one that
  is always true.
- **Never alter a Portal table, its columns, or its RLS policies.** The Portal's
  policies are `to authenticated`; this dashboard is public and anonymous. If
  the browser appears to need a Portal table, that is a design error — route it
  through the ingest job instead.
- `news_sponsors.competition_id` references the Portal's `competitions`. The
  browser never reads `competitions`. Ingest runs on the secret key, bypasses
  RLS, and flips `news_sponsors.active` to false once a competition ends.

## Stack is pinned to match jmcc-portal
The dashboard's React components are eventually copied into the Portal, with the
data layer rewired from localStorage to the Portal's Supabase auth. That copy is
only cheap if both repos agree, so versions here track the Portal, not habit:

- React 19 (not 18), `@astrojs/react` 6, TypeScript 6, Node >= 22.12.0
- Supabase key names are the current ones: `PUBLIC_SUPABASE_URL`,
  `PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`. Not the legacy
  `anon` / `service_role` names.
- Secrets are enforced by `env.schema` in `astro.config.mjs`, not by naming
  convention. A server secret is declared `context: 'server', access: 'secret'`,
  so importing one from client code is a build error rather than a review catch.

Write components so that copy stays cheap: keep persistence behind
`lib/storage.ts` and never reach for `localStorage` directly in a component.

## No site nav — this is not the website
The website's `Nav.astro` was copied in and then **deliberately removed**: the
dashboard is its own product, not a page of wecompete.ca. Do not reinstate it.
`data/site.json` and `jmcc-shield-color.png` were deleted with it — Nav was
their only consumer.

Identity and the one route back to the main site are carried by the `.dash-brand`
wordmark in `DashboardBar.tsx`. The shared `Footer.astro` stays.

## Brand files are copied, not shared
`global.css`, `Footer.astro`, `SocialIcon.astro`, `i18n/`, `data/contact.json`,
and `assets/brand/` are copies from `jmcc-website`. There is no shared package.
**When the website's brand system changes, re-copy them by hand.**

## Commands
- `npm run dev` — local dev
- `npm run build` — production build
- `npm run typecheck` — `astro check`
