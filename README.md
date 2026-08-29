# JMCC News & Resources Dashboard

Public, English-language dashboard keeping JMCC delegates current on trends in
each competition discipline ahead of case preparation. Astro 7 + React islands,
SSR on Vercel, Supabase for data.

**Target: live before Competition 1, November 2026.**

The news feed is for *ambient awareness* — a headline and a link per discipline,
refreshed four times a day. It is deliberately not a research tool; case-prep
depth lives in Technical Specs and Case History.

## Quick start

```bash
npm install
cp .env.example .env    # Sprint 0 runs on fixtures — no keys needed yet
npm run dev
```

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` | Production build (also validates `specs.json`) |
| `npm run typecheck` | `astro check` |
| `npm test` | Unit tests — pins `h()`, the ingest dedupe key |

Node >= 22.12 required.

## Current state — Sprints 0 through 4 complete

The re-skinned prototype is ported to typed React and renders on fixture data.

- ✅ Astro 7 scaffold, Vercel adapter, Tailwind 4, both `@fontsource` faces
- ✅ Brand files copied from `jmcc-website` (see *Brand files* below); site nav deliberately removed
- ✅ Prototype ported to TypeScript, mounted `client:only="react"`
- ✅ Specs content moved to `src/content/specs.json`, zod-validated, status-gated
- ✅ Monospace face fully removed; `tabular-nums` for digit alignment
- ✅ Zero raw hex outside the token blocks; zero rounded corners except `.badge`
- ✅ AI relevance: phrase matcher, badge, and "AI Angle" feed filter (fixture-driven)
- ✅ Lighthouse on the production build: **performance 94, accessibility 100,
  best practices 100, SEO 100** (Sprint 1 gate is ≥ 90 / ≥ 95)
- ✅ Supabase schema, RLS, ingest pipeline — Sprint 2
- ✅ Read APIs (`/api/news`, `/api/reports`, `/api/sponsors`), Sponsor Watch,
  live AI filter, honest empty/unavailable states — Sprint 3
- ❌ Weekly email digest — built in Sprint 4, then **cut before merge**. See
  "Why there is no newsletter" below.
- ⬜ Applying migrations and a real ingest run — blocked on credentials

The UI now reads from the API rather than importing fixtures. With no database
configured the feed renders an honest "not connected yet" state; set
`PUBLIC_USE_FIXTURES=true` to demo on sample data, which is labelled on screen.

## Domain — `news.wecompete.ca`

Set once in `astro.config.mjs → site`; every absolute URL derives from it. Never
hardcode a hostname in a component or page.

Decided 2026-08-23, superseding brief §14's `news.jmccjmsb.ca`. `jmccjmsb.ca` is
legacy-redirect-only — `jmcc-website` 301s it to `wecompete.ca` preserving the
path — so the brief's host would have made every canonical URL here a permanent
redirect target.

**The dashboard is public and anonymous.** It is its own Vercel deployment,
shares no session with `jmcc-portal`, and requires no sign-in. The subdomain is
where it lives, not a door into the Portal.

> **Blocked on CASA IT.** `news` needs a CNAME to the project-specific target
> Vercel shows under Settings → Domains — not the generic one. DNS for
> `wecompete.ca` is owned by CASA IT (Ryan), same as the main site; see
> `MAINTENANCE.md` in `jmcc-website`. Nothing resolves until that record exists.

## Architecture notes

**Shared Supabase project with `jmcc-portal`.** The Portal was there first and
owns `competitions`, `disciplines`, `profiles`, `teams`, and `team_*`. Every
table this repo creates is prefixed `news_`, and no Portal table or policy is
ever altered — see `AGENTS.md`.

**Ingest is scheduled, not on-demand.** The PRD's 30-minute cache would cost
~1,050 NewsData credits/day against a 200/day free tier. Free-tier articles
arrive on a 12-hour delay anyway, so a short cache buys nothing.

**Ingest runs once a day**, `0 11 * * *` (06:00 EDT). Brief §11 specified four
runs; the Vercel account is on the Hobby plan, which permits one cron run per
day, and Vercel rejects a more frequent schedule at deploy time rather than
degrading. This is an accepted trade — see `docs/CRON_OPTIONS.md` for the cost
and the two ways back to four runs.

**AI relevance is decided at ingest, never at render.** `lib/ingest/ai-relevance.ts`
matches a phrase list against title + description. It deliberately never fires on
a bare "AI" token — that string appears inside ordinary words and unrelated
acronyms. The UI badges matches and offers a filter; it does not reorder the
feed, so recency stays the primary sort.

**Copyright.** Title, description, and URL only. Never full article bodies —
that is republication. Always link out.

## Why there is no newsletter

Sprint 4 built a full weekly email digest — subscribe and unsubscribe routes, a
Monday cron, Resend delivery, RFC 8058 one-click unsubscribe. It was removed
before it ever merged, on the owner's call, and the removal is deliberate rather
than a rollback of something broken.

The reasoning is product, not engineering: pushing headlines into a delegate's
inbox removes the small amount of work that makes the habit stick. Delegates are
meant to come to the dashboard. The push channel returns later as a weekly
AI-generated podcast summarising the week's findings, which is a different
enough artifact to be worth the pull it costs.

Removed with it: `src/lib/digest/`, `src/pages/api/digest/`,
`src/pages/api/cron/digest.ts`, the `resend` dependency, `RESEND_API_KEY`,
`DIGEST_FROM`, `PUBLIC_SITE_URL`, the Monday cron in `vercel.json`,
`digestSendLabel()` in `lib/format.ts`, `getDigestItems()` in `lib/feed-repo.ts`,
and the `news_digest_subscribers` table (migration
`20260829000005`). Nothing was ever deployed, so there were no subscribers and
no CASL obligation to honour.

**Do not reinstate it as a shortcut to the podcast.** The podcast is a different
product with a different pipeline; it does not need a subscriber table to
exist.

## Brand files are copied, not shared

`global.css`, `Footer.astro`, `SocialIcon.astro`, `i18n/`, `data/contact.json`,
and `assets/brand/` are **hand copies** from `jmcc-website`. There is no shared package — a versioned design-system
package is the textbook answer, but it means someone maintaining publishing for
a system that changes once a year, on a team of one part-time student developer.

> **When `jmcc-website`'s brand system changes, re-copy those files by hand.**

`Footer.astro` carries a short header comment listing its only intentional
differences from the website original. Keep that delta small so the re-copy
stays mechanical.

The website's `Nav.astro` was copied in during Sprint 0 and then removed on the
owner's call — the dashboard is not the website. `data/site.json` and the colour
shield went with it, since Nav was their only consumer.

## Documentation

- `AGENTS.md` (symlinked as `CLAUDE.md`) — conventions and hard rules
- `docs/EDITING_SPECS.md` — how a non-developer edits Technical Specs content
- `docs/CRON_OPTIONS.md` — why ingest runs once a day, and how to change it
