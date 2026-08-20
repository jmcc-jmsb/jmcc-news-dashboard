-- ABOUTME: Seeds ingest keywords for the 11 disciplines and registers the RSS feeds that actually resolve.
-- ABOUTME: Idempotent — re-running never clobbers a coach's edits to news_discipline_topics.

-- ─────────────────────────────────────────────────────────────────────────────
-- DISCIPLINE TOPICS
--
-- These are the starting keyword sets that move ingest off a code constant
-- (brief §3e). They are a floor, not an answer: the point of this table is that
-- a Marketing coach who says "this year's cases lean on brand strategy over
-- pricing" can be acted on by editing a row, with no deploy.
--
-- ON CONFLICT DO NOTHING is deliberate. Once a human has tuned a discipline,
-- re-running migrations must not silently revert their work. To reset one
-- deliberately, delete the row first.
-- ─────────────────────────────────────────────────────────────────────────────
insert into news_discipline_topics (discipline, keywords, updated_by) values
  ('finance',           array['corporate finance','valuation','mergers acquisitions','private equity','capital markets','interest rates','earnings'], 'seed'),
  ('accounting',        array['financial reporting','IFRS','audit','accounting standards','disclosure','revenue recognition'], 'seed'),
  ('tax',               array['corporate tax','tax policy','transfer pricing','tax reform','CRA','international taxation'], 'seed'),
  ('marketing',         array['brand strategy','consumer behaviour','advertising','market research','customer acquisition','retail marketing'], 'seed'),
  ('strategy',          array['corporate strategy','competitive advantage','business model','market entry','restructuring'], 'seed'),
  ('digital-strategy',  array['digital transformation','platform business','ecommerce','technology adoption','data strategy'], 'seed'),
  ('entrepreneurship',  array['startup funding','venture capital','founders','seed round','scaleup','incubator'], 'seed'),
  ('hr',                array['talent management','workforce','labour market','employee retention','organizational culture','hiring'], 'seed'),
  ('pom',               array['supply chain','operations management','logistics','manufacturing','inventory','procurement'], 'seed'),
  ('sustainability',    array['ESG','climate disclosure','net zero','sustainable finance','emissions','circular economy'], 'seed'),
  ('international',     array['international trade','tariffs','foreign direct investment','global markets','trade policy','supply chain geopolitics'], 'seed')
on conflict (discipline) do nothing;


-- ─────────────────────────────────────────────────────────────────────────────
-- SOURCES
--
-- ⚠ EVERY RSS FEED NAMED IN BRIEF §10 IS DEAD. Verified 2026-08-20 with
-- rss-parser, the same library ingest uses:
--
--   McKinsey          /rss/insights.rss        404   (works at /insights/rss)
--   BCG               /rss/publications.rss    403   (edge bot-block, any UA)
--   Strategy+Business /rss/rssfeed.xml         404   (publication retired)
--   Deloitte          /us/en/insights/rss.xml  404   (no working path found)
--   PwC               /gx/en/rss-feeds/…       403
--
-- The brief anticipated exactly this: "Verify each returns 200 and parses
-- before building on it — public RSS URLs rot."
--
-- Registered below: the one §10 publisher still reachable, plus two substitutes
-- that verify clean. The substitutes are seeded INACTIVE because swapping a
-- consulting feed for an academic one is an editorial decision, not a technical
-- one — PRD §4.3 asked for consulting sources. Flip `active` to true to adopt.
--
-- Sponsor and discipline queries against NewsData/Marketaux are registered too,
-- so one table answers "where does anything come from".
-- ─────────────────────────────────────────────────────────────────────────────
insert into news_sources (name, feed_url, kind, active, last_error) values
  -- Verified working, 50 items, full title/link/date/description.
  ('McKinsey', 'https://www.mckinsey.com/insights/rss', 'rss', true, null),

  -- Verified working. Inactive pending an editorial call: academic, not consulting.
  ('MIT Sloan Management Review', 'https://sloanreview.mit.edu/feed/', 'rss', false,
   'Inactive by default: substitute for a dead §10 feed, pending owner approval.'),
  ('Knowledge at Wharton', 'https://knowledge.wharton.upenn.edu/feed/', 'rss', false,
   'Inactive by default: substitute for a dead §10 feed, pending owner approval.'),

  -- Recorded as dead so the failure is documented rather than rediscovered.
  -- Kept inactive, not deleted: BCG and PwC are 403 (bot-blocked), which can be
  -- lifted, and a future exec should see that these were tried.
  ('BCG', 'https://www.bcg.com/rss/publications.rss', 'rss', false,
   'HTTP 403 as of 2026-08-20 — edge bot-block, unchanged across user agents.'),
  ('PwC', 'https://www.pwc.com/gx/en/rss-feeds/insights.xml', 'rss', false,
   'HTTP 403 as of 2026-08-20.'),
  ('Deloitte', 'https://www2.deloitte.com/us/en/insights/rss.xml', 'rss', false,
   'HTTP 404 as of 2026-08-20 — no working replacement path found.'),
  ('Strategy+Business', 'https://www.strategy-business.com/rss/rssfeed.xml', 'rss', false,
   'HTTP 404 as of 2026-08-20 — publication retired.'),

  -- API sources. feed_url is null; they are queried per discipline and sponsor.
  ('NewsData.io', null, 'newsdata', true, null),
  ('Marketaux', null, 'marketaux', true, null)
on conflict (name) do nothing;
