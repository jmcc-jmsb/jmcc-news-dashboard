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

## Current state — Sprints 0, 0.5 and 1 complete

The re-skinned prototype is ported to typed React and renders on fixture data.

- ✅ Astro 7 scaffold, Vercel adapter, Tailwind 4, both `@fontsource` faces
- ✅ Brand files copied from `jmcc-website` (see *Brand files* below); site nav deliberately removed
- ✅ Prototype ported to TypeScript, mounted `client:only="react"`
- ✅ Specs content moved to `src/content/specs.json`, zod-validated, status-gated
- ✅ Monospace face fully removed; `tabular-nums` for digit alignment
- ✅ Zero raw hex outside the token blocks; zero rounded corners except `.badge` / `.check-circle`
- ✅ AI relevance: phrase matcher, badge, and "AI Angle" feed filter (fixture-driven)
- ✅ Lighthouse on the production build: **performance 94, accessibility 100,
  best practices 100, SEO 100** (Sprint 1 gate is ≥ 90 / ≥ 95)
- ⬜ Supabase, ingest, cron — Sprint 2
- ✅ Read APIs (`/api/news`, `/api/reports`, `/api/sponsors`), Sponsor Watch,
  live AI filter, honest empty/unavailable states — Sprint 3
- ⬜ Applying migrations and a real ingest run — blocked on credentials
- ⬜ Resend weekly digest — Sprint 4

The UI now reads from the API rather than importing fixtures. With no database
configured the feed renders an honest "not connected yet" state; set
`PUBLIC_USE_FIXTURES=true` to demo on sample data, which is labelled on screen.

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
