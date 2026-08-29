-- ABOUTME: Re-keys news_articles and news_reports on (id, discipline) so one story can cover several disciplines.
-- ABOUTME: Drops the old id-only key and the url unique; uniqueness moves to (url, discipline).

-- ─────────────────────────────────────────────────────────────────────────────
-- WHY
--
-- `id text primary key` plus `url text not null unique` allowed a URL to exist
-- exactly once. But matchDisciplines() deliberately returns EVERY discipline a
-- story matches, and lib/ingest/run.ts pushes one row per match — so the extra
-- matches were silently discarded by dedupe before they ever reached Postgres.
-- A story that was legitimately Finance AND Strategy got filed under whichever
-- discipline the topics table happened to return first, with nothing logged.
--
-- That was tolerable at 11 disciplines with distinct vocabularies. It is not at
-- 33: the SMNG, FO and HM keyword sets overlap the JDC ones heavily by design
-- (corporate-finance and finance, taxation and tax, strategic-marketing and
-- marketing), so a typical item now matches five to ten disciplines and all but
-- one were being thrown away.
--
-- The fix is to make the key match the grain of the data: one row per story PER
-- DISCIPLINE. h() is unchanged — it is still exactly the URL hash the frozen
-- contract in AGENTS.md describes, and it is still the first column of the key.
-- What changes is that `id` alone no longer identifies a row.
--
-- Consequently `url` can no longer be unique on its own: the same URL is now
-- expected once per discipline it belongs to. Uniqueness moves to (url,
-- discipline), which preserves the real invariant — one story is not ingested
-- twice into the same discipline — while allowing the cross-discipline rows.
--
-- ── A note on news_reports and `LIKE ... INCLUDING ALL` ──
--
-- The 2026-08-20 migration creates news_reports with
-- `(like news_articles including all)` and comments that this "copies defaults,
-- not null constraints and indexes, but NOT the primary key or unique
-- constraints, so those are restated below" — and then does not restate them.
--
-- That comment is wrong, which is lucky. INCLUDING ALL implies INCLUDING
-- INDEXES, and per the PostgreSQL documentation INCLUDING INDEXES *does* create
-- the PRIMARY KEY, UNIQUE and EXCLUDE constraints of the source table on the new
-- one. So news_reports has an id primary key and a url unique after all, under
-- auto-generated names — not the no-key table the comment implies.
--
-- Because that is inference from the docs rather than something verified against
-- this project's live database, the drops below are written to be
-- name-independent and to tolerate a constraint being either present or absent.
-- They are correct whichever way it actually is.
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop every primary key and unique constraint on both tables, whatever they are
-- called. Naming here is not guessable: constraints copied by LIKE get default
-- names derived from the new table, and `if exists` on a guessed name would
-- silently no-op rather than fail loudly if the guess were wrong.
do $$
declare
  t text;
  c record;
begin
  foreach t in array array['news_articles', 'news_reports'] loop
    for c in
      select conname
        from pg_constraint
       where conrelid = t::regclass
         and contype in ('p', 'u')
    loop
      execute format('alter table %I drop constraint %I', t, c.conname);
    end loop;
  end loop;
end $$;

-- Defensive, and a no-op on the tables as they stand: the old id-only key made
-- (id, discipline) unique by construction. This exists so the migration is also
-- correct against a database where ingest somehow wrote before it was applied.
delete from news_articles a
  using news_articles b
 where a.ctid < b.ctid and a.id = b.id and a.discipline = b.discipline;

delete from news_reports a
  using news_reports b
 where a.ctid < b.ctid and a.id = b.id and a.discipline = b.discipline;

alter table news_articles add primary key (id, discipline);
alter table news_reports  add primary key (id, discipline);

-- The invariant that survives: one story, once, per discipline.
create unique index if not exists news_articles_url_discipline_idx
  on news_articles (url, discipline);
create unique index if not exists news_reports_url_discipline_idx
  on news_reports (url, discipline);

-- The feed's read path is unchanged — (discipline, published_at desc) is still
-- exactly the query — so the existing indexes stay as they are. The composite
-- primary key adds an index on (id, discipline), which also serves the upsert's
-- conflict resolution.
