# Scheduled ingest — DECIDED: once per day on Hobby

> **Owner decision, 2026-08-20: run ingest once a day and stay on the Vercel
> Hobby plan.** No upgrade, no external scheduler. Option 2 below.
>
> **Shipped in Sprint 4.** This block is now in `vercel.json`:
>
> ```json
> "crons": [
>   { "path": "/api/cron/ingest", "schedule": "0 11 * * *" }
> ]
> ```
>
> `0 11 * * *` is **07:00 EDT in summer, 06:00 EST in winter** — the feed is
> refreshed before delegates start their day in either season. It supersedes
> brief §11's four-run schedule. Ingest is now the only cron: the weekly digest
> that sat beside it was cut before merge (see the note below).
>
> **What this costs, stated plainly:** a story breaking just after the daily run
> is invisible for up to 24 hours. That matters most during competition week.
> NewsData's free tier already delays articles ~12 hours, so the practical gap
> versus four runs is smaller than 4× suggests — but it is not nothing. The
> options below stay documented because reversing this is a config change, not
> a rewrite: the ingest code is identical either way.

---

## The original problem

Brief §11 schedules ingest four times a day:

```json
{ "path": "/api/cron/ingest", "schedule": "0 5,11,17,23 * * *" }
{ "path": "/api/cron/digest", "schedule": "0 13 * * 1" }
```

**The Vercel account (`jmcc3`) is on the Hobby plan, which allows at most one
cron run per day.** Deploying the block above is rejected outright:

> Hobby accounts are limited to daily cron jobs. This cron expression
> (0 5,11,17,23 * * *) would run more than once per day.

It fails loudly rather than silently degrading, which is the good version of
this problem — but it does have to be answered before Sprint 2, because §10's
whole ingest design assumes four runs.

`vercel.json` therefore carries no `crons` block yet. The routes it would point
at do not exist until Sprint 2 either, so nothing is lost by waiting.

## Why four runs, and what one run costs

Four runs is not arbitrary. From brief §10:

- NewsData.io free tier is **200 credits/day**; the four-run design spends
  ~88–103.
- The PRD's original 30-minute on-demand cache would have spent ~1,050/day —
  the quota would be gone before noon.
- Free-tier articles arrive on a **12-hour delay** regardless.

That last point cuts both ways. Since the data is already half a day old, the
gap between four runs and one is smaller than it looks — but one run a day
means a story breaking just after ingest is invisible to delegates for a full
24 hours, and competition week is exactly when that matters.

## The three options

### 1. Upgrade to Vercel Pro
Unlocks the §11 schedule exactly as written. Costs money per month, per member.
The simplest technically, and a budget question rather than an engineering one.

### 2. Ship one run a day on Hobby — ✅ CHOSEN
Free and immediate. Change the schedule to a single daily run and accept the
freshness loss. Reversible later by upgrading — the ingest code does not change.

### 3. Trigger ingest from GitHub Actions instead
*(Not chosen. Kept for reference — it is the free way back to four runs.)*
Vercel cron is not the only way to call an HTTP endpoint on a schedule. The repo
already lives on GitHub, Actions cron is free, and §11 already requires the
route to be guarded by a `CRON_SECRET` bearer check *because Vercel cron
endpoints are publicly reachable*. That guard is exactly what makes an external
caller safe — no new attack surface.

```yaml
# .github/workflows/ingest.yml
on:
  schedule:
    - cron: '0 5,11,17,23 * * *'
  workflow_dispatch:          # so a human can force a run
jobs:
  ingest:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -fsS -X POST "https://news.wecompete.ca/api/cron/ingest" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

Keeps the account on Hobby, keeps the four-run schedule, costs nothing.

**Its one real drawback:** GitHub disables scheduled workflows in a repository
after **60 days without commits**. This project will have quiet stretches — the
mandate ends May 2027 and activity is seasonal — so that is a genuine risk, not
a footnote. It also carries `workflow_dispatch` above so a human can always
trigger a run manually, and the failure mode is visible (a red workflow), not
silent.

If the 60-day rule is a concern, option 1 removes it for money and option 3
plus a calendar reminder removes it for attention.

## Note on the removed digest

Brief §11 pairs ingest with a weekly digest cron, `0 13 * * 1`. **That digest was
removed on 2026-08-29** — the owner cut the newsletter so delegates come to the
dashboard rather than have headlines pushed at them. See "Why there is no
newsletter" in the README.

It never constrained this decision either way: `0 13 * * 1` is weekly, which is
once per day or less, so it was always fine on Hobby. Only ingest ever hit the
limit. Its removal frees nothing and changes none of the options below.

## Daylight time — handled, and not the way §11 suggested

Vercel cron speaks only UTC, so a fixed expression lands on a different local
hour depending on the season. Eastern is UTC-4 on daylight time and UTC-5
otherwise:

| Cron (UTC) | Summer (EDT) | Winter (EST) |
|---|---|---|
| `0 11 * * *` — ingest | 07:00 | 06:00 |

**Brief §11 has the direction backwards.** It warns of drift "in November" and
says to "accept 9:00 AM winter digests". In fact a 13:00 UTC job is 08:00 in
winter and 09:00 in summer — so that schedule hit the promised 8:00 AM *exactly
at launch*, and the 9:00 AM case was the summer, off-season one. Nothing needed
fixing for November. (Moot now that the digest is gone, but the direction of the
drift still applies to any future schedule.)

**The fix §11 proposes is unavailable on Hobby.** "Compute the offset
in-handler" normally means scheduling hourly and returning early until the local
hour matches. That requires many runs per day; Hobby permits one. If the plan
ever changes, that option reopens.

**What was done instead.** Ingest is unaffected in practice — 06:00 and 07:00
are both before the day starts, and no UI copy names the hour.

The digest was the user-visible case, because its signup panel promised
subscribers a send time. Rather than hardcode an hour that was wrong half the
year, `digestSendLabel()` derived it from the cron via `Intl` and the
`America/Toronto` zone. That helper went with the digest; if a future feature
ever shows a schedule to a reader, **derive the local time from the cron the
same way rather than writing a clock time into copy.**

**If the send time must be exactly 8:00 AM year-round**, that is a real change,
not a config tweak: it needs two cron expressions swapped twice a year, or the
Pro plan plus hourly no-op scheduling. Given the competition season runs through
the winter half of the year, deriving the label is the better trade.
