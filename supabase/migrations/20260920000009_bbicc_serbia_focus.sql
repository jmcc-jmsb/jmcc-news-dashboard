-- ABOUTME: Retunes BBICC's keywords to Serbian terms, so its first query targets Serbia rather than Europe.
-- ABOUTME: Only overwrites the row if it is still updated_by='seed'; a coach's tuning is never reverted.

-- ─────────────────────────────────────────────────────────────────────────────
-- WHY
--
-- The first live run under country filtering (2026-09-19) gave BBICC eight
-- articles, of which seven were Euronews pieces about the EU at large — fuel
-- prices, pension length, autonomous vehicles across Madrid and Zagreb — and
-- one mentioned Serbia. `country=rs` plus the shared strategy keywords returns
-- what an EU wire distributes into Serbia, not what Serbia's own business desks
-- write about.
--
-- So BBICC asks for Serbia by name. The country filter says the story reached
-- Serbia; these terms say it is ABOUT Serbia.
--
-- That narrows the feed, and Serbia's English-language business press is small,
-- so runIngest tops the country up with one wider query when this one comes
-- back thin (THIN_COUNTRY_RESULT in lib/ingest/run.ts). The wider query reuses
-- the strategy set the other five international competitions share — the same
-- keywords that produced the EU coverage above. Serbian news is therefore
-- preferred, not exclusive, and the feed is never empty for want of asking a
-- second way.
--
-- KEYWORD ORDER MATTERS HERE, unusually: buildQuery takes the first five that
-- fit 100 characters, so the five Serbian terms below are the query and the
-- rest serve matchDisciplines() over RSS. A coach reordering this row changes
-- what BBICC asks NewsData.
--
-- THE SAME THREE RULES AS the earlier topic migrations, because
-- matchDisciplines() is still a plain case-insensitive substring test:
--
--   1. No short bare tokens. Rejected while writing this file: 'nis' (Serbia's
--      oil company, but it fires on "finish", "Tunisia", "minister"), 'rsd'
--      inside other codes, and 'eps' ("steps"). The company names are spelled
--      out instead.
--   2. Prefer the stem. 'privatiz' plus 'privatis' catches both spellings of
--      privatize/privatisation, which is a recurring Serbian business story.
--   3. Spell both dialects, and the local spelling where English press uses it:
--      'belgrade' and 'beograd'.

update news_discipline_topics
   set keywords = array[
         -- The query: five terms, 49 characters.
         'serbia','serbian','belgrade','novi sad','dinar',
         -- The tail: RSS matching only, unless a coach reorders the row.
         'beograd','western balkans','vojvodina','serbian government',
         'belgrade stock exchange','privatiz','privatis','state-owned enterprise',
         'foreign direct investment','european union accession','eu accession',
         'balkan economy','regional expansion','joint venture','acquir'
       ],
       updated_by = 'seed',
       updated_at = now()
 where discipline = 'bbicc'
   and updated_by = 'seed';
