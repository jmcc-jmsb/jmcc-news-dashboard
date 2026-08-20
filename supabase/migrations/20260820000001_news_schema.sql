-- ABOUTME: Creates every table this dashboard owns, all prefixed news_, with RLS enabled in the same migration.
-- ABOUTME: Shares a Supabase project with jmcc-portal — this file must never alter a Portal-owned object.

-- ─────────────────────────────────────────────────────────────────────────────
-- WHY THE news_ PREFIX, AND WHY THIS FILENAME
--
-- This project shares one Supabase project with jmcc-portal (brief §3e). The
-- Portal was there first and already owns `competitions`, `disciplines`,
-- `profiles`, `teams` and the `team_*` tables. Brief §3d asked for a bare
-- `create table competitions (...)`, which would fail outright here, and whose
-- shape disagrees with the Portal's anyway (name_en/name_fr, starts_on/ends_on,
-- a status check constraint rather than an `active` boolean).
--
-- So: every table below is prefixed `news_`, uniformly — including the ones
-- that do not collide today. A naming rule with remembered exceptions is worse
-- than one that is always true.
--
-- The filename is timestamped rather than sequential because the Portal uses
-- 0001..0009 in its own repo against the same database. Two repos numbering
-- migrations independently will collide sooner or later; a timestamp sorts
-- after every Portal migration and can never clash with one.
--
-- THE HARD RULE: this file creates and alters only news_* objects. It reads
-- `competitions` by foreign key and nothing more. It must never ALTER, DROP, or
-- add a policy to a Portal table.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── Articles ─────────────────────────────────────────────────────────────────
-- id is h(url): a 32-bit hash of the URL, base-36, prefixed 'x'. It is computed
-- in lib/format.ts and is the dedupe key — the same story ingested twice from
-- two sources collapses to one row. Changing that function re-keys the table.
--
-- Copyright (brief §10): title, description and url only. Never the body. The
-- absence of a `content` column here is deliberate and load-bearing — storing
-- full article text would be republication.
create table if not exists news_articles (
  id            text primary key,
  type          text not null default 'article',
  title         text not null,
  description   text,
  url           text not null unique,
  source        text not null,
  published_at  timestamptz not null,
  discipline    text not null,
  sponsor_id    uuid,
  ai_relevant   boolean not null default false,
  pinned        boolean not null default false,
  pinned_note   text,
  ingested_at   timestamptz not null default now()
);

-- The feed's only query: newest first, within one discipline.
create index if not exists news_articles_discipline_published_idx
  on news_articles (discipline, published_at desc);

-- Partial: the vast majority of rows have no sponsor, and indexing nulls would
-- be most of the table for a lookup that only ever wants the few that do.
create index if not exists news_articles_sponsor_idx
  on news_articles (sponsor_id) where sponsor_id is not null;

-- Drives the AI Angle filter without a sequential scan once the table grows.
create index if not exists news_articles_ai_idx
  on news_articles (discipline, published_at desc) where ai_relevant;


-- ── Reports ──────────────────────────────────────────────────────────────────
-- Same shape as articles. `like ... including all` copies defaults, not null
-- constraints and indexes, but NOT the primary key or unique constraints, so
-- those are restated below.
create table if not exists news_reports (like news_articles including all);
alter table news_reports alter column type set default 'report';


-- ── Sources ──────────────────────────────────────────────────────────────────
-- One row per feed. last_error exists because public RSS URLs rot, and they rot
-- silently: as of 2026-08-20 all five feeds named in brief §10 were dead (four
-- 404, one 403). A feed that starts failing must be visible, not invisible.
create table if not exists news_sources (
  id           uuid primary key default gen_random_uuid(),
  -- Unique so the seed can be idempotent. feed_url cannot serve that purpose:
  -- it is null for the API sources, and null never conflicts in a unique index,
  -- so re-running the seed would insert a second NewsData row every time.
  name         text not null unique,
  feed_url     text unique,
  kind         text not null check (kind in ('rss', 'newsdata', 'marketaux')),
  active       boolean not null default true,
  last_fetched timestamptz,
  last_error   text
);


-- ── Digest subscribers ───────────────────────────────────────────────────────
-- The one table with personal data in it. It has NO public read policy at all —
-- see the RLS block below.
create table if not exists news_digest_subscribers (
  email             text primary key,
  disciplines       text[] not null default '{}',
  subscribed_at     timestamptz not null default now(),
  unsubscribe_token uuid not null default gen_random_uuid()
);

-- Unsubscribe links resolve by token, never by email.
create unique index if not exists news_digest_subscribers_token_idx
  on news_digest_subscribers (unsubscribe_token);


-- ── Sponsors ─────────────────────────────────────────────────────────────────
-- Competition-scoped, and ships EMPTY (brief §3d). Sponsor Watch hides itself
-- when there are zero active rows; it must never render an empty rail.
--
-- competition_id references the PORTAL's competitions table. That reference is
-- the whole reason there is no news_competitions: the Portal already models
-- competitions properly and duplicating them would create a second source of
-- truth for the same dates.
--
-- The browser never reads `competitions`. Ingest runs on the secret key, so it
-- bypasses RLS, and it is what flips `active` to false once a competition ends
-- (see the helper below). That keeps the Portal's own RLS untouched.
create table if not exists news_sponsors (
  id             uuid primary key default gen_random_uuid(),
  competition_id uuid references competitions(id) on delete cascade,
  name           text not null,
  keywords       text[] not null default '{}',
  active         boolean not null default true
);

create index if not exists news_sponsors_active_idx
  on news_sponsors (active) where active;

-- Now that news_sponsors exists, point the article FKs at it.
alter table news_articles
  drop constraint if exists news_articles_sponsor_id_fkey,
  add constraint news_articles_sponsor_id_fkey
    foreign key (sponsor_id) references news_sponsors(id) on delete set null;

alter table news_reports
  drop constraint if exists news_reports_sponsor_id_fkey,
  add constraint news_reports_sponsor_id_fkey
    foreign key (sponsor_id) references news_sponsors(id) on delete set null;


-- ── Discipline topics ────────────────────────────────────────────────────────
-- The ingest keyword map, moved out of code so a coach's feedback can retune a
-- discipline's feed without a deploy (brief §3e).
--
-- Treat this as EXTERNAL data. The Delegate Portal may eventually write to it
-- too; this dashboard reads it and does not own it.
create table if not exists news_discipline_topics (
  discipline   text primary key,
  keywords     text[] not null,
  coach_notes  text,
  updated_by   text,
  updated_at   timestamptz not null default now()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
--
-- Enabled in the same migration that creates each table (brief §10), because a
-- table with RLS off is invisible in an audit and "we'll turn it on later" is
-- how data leaks.
--
-- This dashboard is PUBLIC and ANONYMOUS. That is the key difference from the
-- Portal, whose policies are all `to authenticated`. Read policies here target
-- `anon` and `authenticated` both, so the same rows serve the public dashboard
-- and, later, an authenticated copy inside the Portal.
--
-- Writes are service-role only. The secret key bypasses RLS entirely, so there
-- is deliberately no write policy anywhere below — absence of a policy is the
-- write protection.
-- ─────────────────────────────────────────────────────────────────────────────

alter table news_articles           enable row level security;
alter table news_reports            enable row level security;
alter table news_sources            enable row level security;
alter table news_sponsors           enable row level security;
alter table news_discipline_topics  enable row level security;
alter table news_digest_subscribers enable row level security;

drop policy if exists news_articles_read on news_articles;
create policy news_articles_read on news_articles
  for select to anon, authenticated using (true);

drop policy if exists news_reports_read on news_reports;
create policy news_reports_read on news_reports
  for select to anon, authenticated using (true);

-- Readable so a status page can show which feeds are healthy. last_error may
-- contain an upstream message; it must never contain a key, so ingest truncates
-- and scrubs before writing (see lib/ingest/rss.ts).
drop policy if exists news_sources_read on news_sources;
create policy news_sources_read on news_sources
  for select to anon, authenticated using (true);

-- Only ACTIVE sponsors are visible. Inactive rows are last season's data and
-- are nobody's business publicly.
drop policy if exists news_sponsors_read on news_sponsors;
create policy news_sponsors_read on news_sponsors
  for select to anon, authenticated using (active);

-- Public read because ingest reads it, and because a coach or exec looking at
-- Supabase Studio should be able to see what a discipline is tuned to.
drop policy if exists news_discipline_topics_read on news_discipline_topics;
create policy news_discipline_topics_read on news_discipline_topics
  for select to anon, authenticated using (true);

-- news_digest_subscribers gets NO policy of any kind. RLS is on and nothing
-- grants select, so anon and authenticated both see zero rows. Subscribe and
-- unsubscribe go through API routes holding the secret key.
--
-- Do not add a read policy here to make something convenient. It is a list of
-- students' email addresses.
