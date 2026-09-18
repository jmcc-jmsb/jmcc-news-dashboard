<!-- ABOUTME: The remaining steps to take the dashboard from "not connected" to a live feed. -->
<!-- ABOUTME: Written 2026-09-17, after DNS and the database were done. Delete the done half once the feed is live. -->

# Going live

Where this stands as of **2026-09-17**, and exactly what is left. Steps 1 to 4 are
one sitting, maybe 30 minutes. Step 5 needs other people and is the long pole.

## Already done — do not redo

- **`https://news.wecompete.ca` resolves and serves the site.** CNAME `news` →
  `938eaa8e23144ead.vercel-dns-017.com.` (TTL 300) in the cPanel Zone Editor;
  the domain is attached to the Vercel project and Vercel issued the TLS
  certificate, which auto-renews.
- **The database exists.** One Supabase project, `jmcc-portal`
  (ref `xdctvdtfosjybhdkabir`, Postgres 17, ca-central-1), shared with the Portal
  exactly as `AGENTS.md` describes. It was empty until 2026-09-17, so the
  Portal's nine migrations were applied first (26 tables, including the
  `competitions` table `news_sponsors` references), then this repo's seven.
  Live now: the five `news_` tables with RLS on, 33 discipline keyword sets,
  20 active RSS sources, zero articles until the first ingest.

The feed still renders its honest "not connected" state, and `/api/news` answers
503, because **Vercel has no environment variables at all**. That is step 1.

## 1. Add the six environment variables in Vercel

<https://vercel.com/jmcc3/jmcc-news-dashboard/settings/environment-variables>

Tick **Production** only. Tick **Sensitive** on the four marked below, so the
value can never be read back out of the dashboard.

| Key | Sensitive | Value |
|---|---|---|
| `PUBLIC_SUPABASE_URL` | no | `https://xdctvdtfosjybhdkabir.supabase.co` |
| `PUBLIC_SUPABASE_PUBLISHABLE_KEY` | no | Supabase → Project Settings → API Keys → publishable key (`sb_publishable_…`) |
| `SUPABASE_SECRET_KEY` | **yes** | Same page → secret keys → **+ New secret key**, name it `jmcc-news-dashboard` (`sb_secret_…`) |
| `NEWSDATA_API_KEY` | **yes** | newsdata.io dashboard |
| `MARKETAUX_API_KEY` | **yes** | marketaux.com dashboard |
| `CRON_SECRET` | **yes** | Generate one, see below |

**Create the dashboard its own Supabase secret key** rather than reusing the
Portal's. Either key bypasses RLS and can read every Portal table, so the point
is being able to revoke this one without taking the Portal down with it.

**`CRON_SECRET`** is any long random string. Vercel sends it to the ingest route
as a bearer token on every scheduled run, and `/api/cron/ingest` refuses to do
anything without it. Generate it in a terminal and paste it straight into
Vercel — don't put it in a chat, a commit, or a screenshot:

    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

**Do not set `PUBLIC_USE_FIXTURES` in Production.** It defaults to false. On, it
serves invented headlines attributed to real mastheads, invented sponsor
financials, and textbook specs content. It exists for the pilot recording and
for tester previews, and every screen it touches is banner-ed as sample data.

## 2. Redeploy

Environment variables only reach a new build. Vercel → **Deployments** → the
latest Production deployment → **⋯** → **Redeploy**.

Then confirm the API is connected rather than 503:

    curl -s https://news.wecompete.ca/api/news?discipline=finance | head -c 200

An empty `items` array is the correct answer here — nothing has been ingested
yet. A 503 means the variables did not reach the build.

## 3. Run the first ingest by hand

Don't wait for the cron. Using the `CRON_SECRET` from step 1:

    curl -s -H "Authorization: Bearer <CRON_SECRET>" \
      https://news.wecompete.ca/api/cron/ingest

Read the JSON it returns:

- **200** — everything worked.
- **207** — rows were written, but at least one source failed. Look at
  `sourceErrors`; a rotted feed URL is the usual cause and is recorded in
  `news_sources.last_error` too.
- **500** — either the run threw, or it saved nothing at all. Zero rows is
  deliberately a failure: a feed that updates nothing must never read as green.
- `newsDataSkipped` above zero means NewsData refused queries mid-run (a 429, or
  our own ceiling). The rest of the run still completed; see
  `docs/CRON_OPTIONS.md` for the budget. A manual re-run within 15 minutes of
  another run will usually get here.
- `newsDataDeferred` is normally 3. That is expected, not a failure: 33
  disciplines do not fit NewsData's 30-per-15-minutes limit, so three sit out
  each day in rotation.

Then load <https://news.wecompete.ca> and check that headlines appear, that the
discipline bar switches sections, and that the AI Angle filter shows a count.

## 4. Confirm the cron is registered

Vercel → the project → **Cron Jobs**. Expect exactly one entry,
`/api/cron/ingest` at `0 11 * * *` (07:00 EDT / 06:00 EST). It should run once a
day. If it is missing, the deploy did not pick up `vercel.json`.

After the first automatic run, check Vercel's cron history: a red entry means
the run saved nothing, and the response body says why.

## 5. Content — the actual gate on launching

The software is finished; these are not.

- **Technical Specs** — all 11 JDC/JDCC disciplines are drafts. A discipline
  shows an "in development" message until a coach signs it off, and the tab
  disappears entirely if none is ready. Getting coaches to write these is the
  slowest item before Competition 1 in November. See `docs/EDITING_SPECS.md`.
- **Sponsor Tracker** — the three profiles are invented. Real ones go in once
  sponsorship closes. See `docs/EDITING_SPONSORS.md`.
- **The pilot video** — `docs/PILOT_WALKTHROUGH.md` is a shot-by-shot script for
  the VP Academics recording. It ends by asking for exactly the two things
  above, so recording it is how the content gets unblocked.

## Working on the database later

**`supabase db push` does not work from this repo any more.** The database is
shared with the Portal, and its migration history holds the Portal's `0001`
through `0009`, which do not exist here. Push refuses with
`LegacyDbPushMissingLocalError`.

Apply a new migration here with:

    supabase db query --linked -f supabase/migrations/<file>.sql

**Never run the `supabase migration repair --status reverted …` command the CLI
suggests in that error.** It would mark the Portal's migrations as reverted and
corrupt the Portal's history, which still uses `db push` normally. The trade is
deliberate: this repo's migrations are not recorded in `supabase_migrations`, so
keep track of what has been applied by hand. Applied as of 2026-09-17: all seven
files through `20260829000007_multi_discipline_articles.sql`.
