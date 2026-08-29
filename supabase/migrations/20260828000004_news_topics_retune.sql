-- ABOUTME: Retunes news_discipline_topics for trade-press vocabulary; the seed's phrases matched almost nothing.
-- ABOUTME: Only overwrites rows still marked updated_by='seed', so a coach's tuning is never reverted.

-- ─────────────────────────────────────────────────────────────────────────────
-- WHY
--
-- matchDisciplines() is a plain substring test over `title + description`. The
-- 2026-08-20 seed filled it with consulting-report phrases — "talent
-- management", "digital transformation", "mergers acquisitions" — which trade
-- press does not write. Measured against live feeds on 2026-08-28, per fetch:
--
--   HR Dive              0 of 10 matched   (an all-HR publication)
--   CIO Dive             0 of 10 matched   (an all-IT-strategy publication)
--   Accounting Today     0 of 10 matched
--   McKinsey             2 of 50 matched
--
-- Adding sources (see 20260828000003) does nothing while the filter rejects
-- ~90% of what arrives. These sets keep every seed phrase that can still fire
-- and add the words the new sources actually use.
--
-- THREE RULES, because the match is a substring and not a word:
--
--   1. No short bare tokens. The seed shipped 'CRA', which matches "aircraft"
--      and "craft"; it is replaced with 'canada revenue agency'. For the same
--      reason there is no bare 'tax' ("taxonomy"), no 'import' ("important"),
--      no 'hr' ("through"), and no 'series a' ("series and").
--   2. Prefer the stem. 'tariff' catches tariffs; 'founder' catches founders;
--      'decarboniz' catches both spellings of decarbonise/decarbonize.
--   3. Spell both dialects. Canadian feeds write "labour market" and US feeds
--      write "labor market"; 'ecommerce' does not match "e-commerce".
--
-- Overlap between disciplines is intended, not a defect — matchDisciplines
-- returns every hit and one story can legitimately be finance and strategy.
-- ─────────────────────────────────────────────────────────────────────────────

insert into news_discipline_topics (discipline, keywords, updated_by) values
  ('finance', array[
    'corporate finance','valuation','private equity','capital markets','interest rates','earnings',
    'merger','acquisition','buyout','ipo','initial public offering','debt financing','refinanc',
    'credit rating','dividend','share buyback','bond market','hedge fund','quarterly results',
    'cost of capital','balance sheet','cash flow','write-down','shareholder'
  ], 'seed'),

  ('accounting', array[
    'financial reporting','ifrs','audit','accounting standards','disclosure','revenue recognition',
    'gaap','fasb','accounting firm','restatement','internal controls','goodwill impairment',
    'financial statement','bookkeeping','accrual','sec filing','materiality','fair value'
  ], 'seed'),

  ('tax', array[
    'corporate tax','tax policy','transfer pricing','tax reform','international taxation',
    'canada revenue agency','taxation','tax credit','tax rate','income tax','sales tax','capital gains',
    'tax break','tax incentive','tax bill','tax haven','withholding','gst','hst','irs'
  ], 'seed'),

  ('marketing', array[
    'brand strategy','consumer behaviour','consumer behavior','advertising','market research',
    'customer acquisition','retail marketing','ad spend','ad revenue','brand campaign',
    'marketing budget','consumer spending','loyalty program','influencer','media buying',
    'rebrand','brand awareness','direct-to-consumer','customer experience','shopper','cmo'
  ], 'seed'),

  ('strategy', array[
    'corporate strategy','competitive advantage','business model','market entry','restructuring',
    'divestiture','spin-off','joint venture','market share','growth strategy','turnaround',
    'consolidation','competitive','expansion plan','partnership','pivot','core business'
  ], 'seed'),

  ('digital-strategy', array[
    'digital transformation','platform business','ecommerce','e-commerce','technology adoption',
    'data strategy','cloud migration','artificial intelligence','machine learning','automation',
    'saas','digital platform','cybersecurity','data analytics','legacy system','it spending',
    'software adoption','digitization','digitisation','api'
  ], 'seed'),

  ('entrepreneurship', array[
    'startup','venture capital','founder','seed round','scaleup','incubator','accelerator',
    'angel investor','funding round','early-stage','pre-seed','unicorn','bootstrapp','spinout',
    'entrepreneur','pitch deck','term sheet','exit'
  ], 'seed'),

  ('hr', array[
    'talent management','workforce','labour market','labor market','employee retention',
    'organizational culture','organisational culture','hiring','layoff','job cuts','headcount',
    'return to office','remote work','hybrid work','employee benefits','recruiting','recruitment',
    'wages','salary','union','turnover','upskilling','reskilling','employee engagement',
    'workplace','talent','compensation','staffing'
  ], 'seed'),

  ('pom', array[
    'supply chain','operations management','logistics','manufacturing','inventory','procurement',
    'warehouse','distribution centre','distribution center','freight','shipping','lead time',
    'production capacity','factory','plant closure','quality control','fulfillment','fulfilment',
    'sourcing','throughput','just-in-time','bottleneck','automation'
  ], 'seed'),

  ('sustainability', array[
    'esg','climate disclosure','net zero','sustainable finance','emissions','circular economy',
    'decarboniz','decarbonis','renewable','carbon','sustainability','scope 3','greenwashing',
    'clean energy','recycling','waste reduction','biodiversity','csrd','climate risk','green bond'
  ], 'seed'),

  ('international', array[
    'international trade','tariff','foreign direct investment','global markets','trade policy',
    'supply chain geopolitics','export','imports','cross-border','trade war','usmca','cusma','wto',
    'sanctions','exchange rate','emerging markets','offshoring','nearshoring','free trade',
    'customs','trade deal','global supply'
  ], 'seed')

-- Only rows no human has touched. The seed writes updated_by='seed'; a coach
-- editing through the Portal writes their own identifier, and this leaves those
-- alone — same guarantee the seed's `do nothing` was protecting, but able to
-- ship a correction to rows nobody has claimed.
on conflict (discipline) do update
   set keywords   = excluded.keywords,
       updated_by = excluded.updated_by,
       updated_at = now()
 where news_discipline_topics.updated_by = 'seed';
