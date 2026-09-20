-- ABOUTME: Adds ingest keyword sets for the six international case competitions.
-- ABOUTME: Only overwrites rows still marked updated_by='seed', so a coach's tuning is never reverted.

-- ─────────────────────────────────────────────────────────────────────────────
-- WHY
--
-- The four regional sections are subject-area competitions: a delegate prepares
-- a finance case, a marketing case. The international circuit is not organised
-- that way — a team at TUBC or MICC gets one general business case — so these
-- six rows are competitions rather than disciplines, and their keywords are the
-- strategy register the other sections split across 'strategy',
-- 'mergers-acquisitions' and 'international'.
--
--   TUBC   Bangkok, Thailand
--   Eller  Tucson, United States
--   HICC   Gainesville, United States
--   MICC   Los Angeles, United States
--   UNICC  Pamplona, Spain
--   BBICC  Belgrade, Serbia
--
-- What separates their feeds is COUNTRY, not keywords: lib/disciplines.ts gives
-- each one a host country and ingest sends one country-filtered NewsData query
-- per distinct country, tagging the result to every competition held there.
-- That is also why five of the six share a keyword set. Eller is the exception
-- and it is not an arbitrary one: it is the circuit's only ethics competition
-- (jmcc-website's own blurb), so it reads governance and conduct news.
--
-- THE SAME THREE RULES AS 20260828000004 and 20260829000006, because
-- matchDisciplines() is still a plain case-insensitive substring test over
-- `title + description`:
--
--   1. No short bare tokens. Rejected while writing this file: 'esg'
--      ("designate"), 'ipo' ("ipod"), 'bid' ("forbidden", "bidding war" is
--      spelled out), 'ceo' is safe but says nothing on its own, 'jv'
--      ("javelin"). Each is spelled out instead.
--   2. Prefer the stem. 'restructur' catches restructure, restructures,
--      restructured and restructuring; 'expand' plus 'expansion'; 'acquir'
--      catches acquire, acquires, acquired and acquiring.
--   3. Spell both dialects. 'globalization' and 'globalisation',
--      'organizational' and 'organisational', 'licence' and 'license'.
-- ─────────────────────────────────────────────────────────────────────────────

insert into news_discipline_topics (discipline, keywords, updated_by) values

  -- ═══ General business-case competitions ════════════════════════════════════
  -- One shared set. A coach retuning one of them through the Portal changes
  -- only that competition's row, which is the point of keeping these per-id.

  ('tubc', array[
    'business strategy','market entry','competitive advantage','corporate strategy',
    'restructur','expansion plan','joint venture','acquir','turnaround plan',
    'growth strategy','new market','market share','business model','supply chain',
    'globalization','globalisation','emerging market','foreign investment',
    'cross-border','trade agreement','manufacturing hub','export growth'
  ], 'seed'),

  ('hicc', array[
    'business strategy','market entry','competitive advantage','corporate strategy',
    'restructur','expansion plan','joint venture','acquir','turnaround plan',
    'growth strategy','new market','market share','business model','supply chain',
    'globalization','globalisation','emerging market','foreign investment',
    'cross-border','trade agreement','consumer demand','quarterly results'
  ], 'seed'),

  ('micc', array[
    'business strategy','market entry','competitive advantage','corporate strategy',
    'restructur','expansion plan','joint venture','acquir','turnaround plan',
    'growth strategy','new market','market share','business model','supply chain',
    'globalization','globalisation','emerging market','foreign investment',
    'cross-border','trade agreement','media company','technology sector'
  ], 'seed'),

  ('unicc', array[
    'business strategy','market entry','competitive advantage','corporate strategy',
    'restructur','expansion plan','joint venture','acquir','turnaround plan',
    'growth strategy','new market','market share','business model','supply chain',
    'globalization','globalisation','european union','foreign investment',
    'cross-border','trade agreement','eurozone','european commission'
  ], 'seed'),

  ('bbicc', array[
    'business strategy','market entry','competitive advantage','corporate strategy',
    'restructur','expansion plan','joint venture','acquir','turnaround plan',
    'growth strategy','new market','market share','business model','supply chain',
    'globalization','globalisation','emerging market','foreign investment',
    'cross-border','trade agreement','privatization','privatisation'
  ], 'seed'),

  -- ═══ The circuit's only ethics competition ═════════════════════════════════
  -- Deliberately close to 'cfa-ethics-challenge': both read conduct news, and
  -- an article that fits one usually fits the other. They stay separate rows
  -- because FO's is a finance-sector case and Eller's is a general one.

  ('eller', array[
    'business ethics','corporate governance','code of conduct','conflict of interest',
    'whistleblower','ethics investigation','compliance failure','regulatory settlement',
    'corporate misconduct','board of directors','shareholder lawsuit','enforcement action',
    'executive compensation','data privacy','product safety','recall','labour practices',
    'labor practices','supply chain audit','greenwashing','misleading advertising',
    'consumer protection'
  ], 'seed')

-- Same guard as 20260828000004 and 20260829000006: only rows no human has
-- touched. The seed writes updated_by='seed'; a coach editing through the
-- Portal writes their own identifier, and this leaves those alone.
on conflict (discipline) do update
   set keywords   = excluded.keywords,
       updated_by = excluded.updated_by,
       updated_at = now()
 where news_discipline_topics.updated_by = 'seed';
