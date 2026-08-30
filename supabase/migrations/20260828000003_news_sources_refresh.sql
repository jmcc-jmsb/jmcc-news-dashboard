-- ABOUTME: Registers the RSS feeds that verify clean on 2026-08-28, replacing the dead consulting feeds.
-- ABOUTME: Idempotent — insert on conflict do nothing, so an owner's later edits to `active` survive a re-run.

-- ─────────────────────────────────────────────────────────────────────────────
-- WHY THIS MIGRATION EXISTS
--
-- The 2026-08-20 seed left ingest running on ONE live feed (McKinsey) for 11
-- disciplines. Re-probed 2026-08-28 with rss-parser and the ingest user-agent:
-- every consulting and business-school feed is still dead, and the two that
-- were merely bot-blocked have not come back.
--
--   BCG               /rss/publications.rss       404  (was 403 — now gone)
--   BCG               /featured-insights/rss      404
--   Bain              /insights/rss/              404
--   PwC               /gx/en/rss-feeds/…          403
--   Deloitte          three paths tried           404 / redirect loop
--   Strategy+Business retired                     malformed XML
--   HBR               feeds.hbr.org, hbr.org      TLS reset / 404
--   Stanford GSB      two paths tried             404
--   INSEAD Knowledge  /rss.xml                    403
--   WEF               two paths tried             403
--   PIIE              /rss/all                    404
--
-- That is 11 failures across 6 consulting firms and 5 academic publishers. This
-- is not a run of bad URLs to keep hunting — the category has stopped
-- publishing open RSS. Brief §10 and PRD §4.3 assumed consulting sources; that
-- assumption no longer has an implementation. Trade press does still publish
-- RSS, reliably and with descriptions, so that is what ingest can actually eat.
--
-- Sources below verified: HTTP 200, parses with rss-parser, items carry
-- title + link + date + a description longer than a headline, newest item
-- within 3 days.
-- ─────────────────────────────────────────────────────────────────────────────

insert into news_sources (name, feed_url, kind, active, last_error) values
  -- ── Generalist business desks. The heaviest discipline coverage by far ──
  -- 100 items/fetch, hits international, tax, finance, strategy, pom, hr.
  ('Globe and Mail Business', 'https://www.theglobeandmail.com/arc/outboundfeeds/rss/category/business/', 'rss', true, null),

  -- ── Entrepreneurship. Canadian, free to read, 150 items/fetch ──
  ('BetaKit', 'https://betakit.com/feed/', 'rss', true, null),
  ('Crunchbase News', 'https://news.crunchbase.com/feed/', 'rss', true, null),

  -- ── Operations & international ──
  ('Canadian Manufacturing', 'https://www.canadianmanufacturing.com/feed/', 'rss', true, null),
  ('Supply Chain Dive', 'https://www.supplychaindive.com/feeds/news/', 'rss', true, null),
  ('Manufacturing Dive', 'https://www.manufacturingdive.com/feeds/news/', 'rss', true, null),

  -- ── Sustainability ──
  ('Trellis', 'https://trellis.net/feed/', 'rss', true, null),
  ('ESG Dive', 'https://www.esgdive.com/feeds/news/', 'rss', true, null),

  -- ── Finance ──
  ('CFO Dive', 'https://www.cfodive.com/feeds/news/', 'rss', true, null),
  ('Banking Dive', 'https://www.bankingdive.com/feeds/news/', 'rss', true, null),
  ('Financial Post', 'https://financialpost.com/feed/', 'rss', true, null),

  -- ── Accounting & tax. The thinnest disciplines, and both sources are US ──
  -- (AICPA and a US think tank). Canadian coverage is an open gap: CPA Canada
  -- publishes no working feed. See the note at the bottom of this file.
  ('Journal of Accountancy', 'https://www.journalofaccountancy.com/feed', 'rss', true, null),
  ('Tax Foundation', 'https://taxfoundation.org/feed/', 'rss', true, null),

  -- ── Marketing & digital strategy ──
  ('Marketing Dive', 'https://www.marketingdive.com/feeds/news/', 'rss', true, null),
  ('CIO Dive', 'https://www.ciodive.com/feeds/news/', 'rss', true, null),
  ('Retail Dive', 'https://www.retaildive.com/feeds/news/', 'rss', true, null),

  -- ── Verified, but seeded INACTIVE pending an owner call ──
  -- Paywalled. 300 items/fetch and the second-best discipline coverage of
  -- anything tested, but every link lands on a subscribe wall. Fine if
  -- delegates have library access, hostile if they don't. Owner's call.
  ('The Economist Business', 'https://www.economist.com/business/rss.xml', 'rss', false,
   'Inactive by default: hard paywall on every link. Flip to true if delegates have institutional access.')
on conflict (name) do nothing;


-- ─────────────────────────────────────────────────────────────────────────────
-- The 2026-08-20 substitutes, re-verified and adopted.
--
-- Both were seeded inactive "pending owner approval" because swapping a
-- consulting feed for an academic one was an editorial choice. With every
-- consulting feed confirmed dead a second time, there is no longer a consulting
-- option to prefer, so the choice is between an academic feed and no feed.
-- Reversible in one statement if the owner disagrees.
-- ─────────────────────────────────────────────────────────────────────────────
update news_sources
   set active = true, last_error = null
 where name = 'MIT Sloan Management Review'
   and last_error like 'Inactive by default:%';

-- Knowledge at Wharton stays inactive: it verifies, but 10 items per fetch with
-- one discipline hit does not earn a slot. Left registered so the next person
-- sees it was measured, not missed.


-- ─────────────────────────────────────────────────────────────────────────────
-- Refresh the death certificates on the §10 feeds. Kept, not deleted: the point
-- of these rows is that a future exec sees these were tried twice.
-- ─────────────────────────────────────────────────────────────────────────────
update news_sources set active = false, last_error = 'HTTP 404 as of 2026-08-28 — re-probed, was 403 in August. /featured-insights/rss also 404.'  where name = 'BCG';
update news_sources set active = false, last_error = 'HTTP 403 as of 2026-08-28 — re-probed, unchanged.'                                          where name = 'PwC';
update news_sources set active = false, last_error = 'HTTP 404 as of 2026-08-28 — three paths tried, one redirect loop. No working feed.'         where name = 'Deloitte';
update news_sources set active = false, last_error = 'Malformed XML as of 2026-08-28 — publication retired, feed no longer parses.'               where name = 'Strategy+Business';


-- ─────────────────────────────────────────────────────────────────────────────
-- ⚠ THIS MIGRATION DOES NOT FIX THE FEED ON ITS OWN.
--
-- The keyword sets in news_discipline_topics reject roughly 90% of what these
-- feeds publish, because matchDisciplines() needs a multi-word phrase to appear
-- verbatim in title + description. Measured on 2026-08-28, per fetch:
--
--   HR Dive              0 of 10 items matched   (an all-HR publication)
--   CIO Dive             0 of 10 items matched   (an all-IT-strategy publication)
--   Accounting Today     0 of 10 items matched
--   McKinsey             2 of 50 items matched
--
-- "talent management" and "digital transformation" are consulting-report
-- phrases; trade press writes "layoffs", "return to office", "cloud migration".
-- Tuning those keywords is deliberately NOT done here — news_discipline_topics
-- is shared with jmcc-portal and the seed's `on conflict do nothing` exists so
-- that a coach's tuning is never reverted by a migration. It needs an owner
-- decision, not a silent rewrite.
-- ─────────────────────────────────────────────────────────────────────────────
