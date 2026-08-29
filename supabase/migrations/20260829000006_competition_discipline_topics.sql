-- ABOUTME: Adds ingest keyword sets for the 22 SMNG, FO and HM competition disciplines.
-- ABOUTME: Only overwrites rows still marked updated_by='seed', so a coach's tuning is never reverted.

-- ─────────────────────────────────────────────────────────────────────────────
-- WHY
--
-- news_discipline_topics has carried the 11 JDC/JDCC disciplines since the
-- 2026-08-20 seed. Delegates also compete in three regional competitions whose
-- categories are finer-grained than "finance" or "marketing":
--
--   SMNG — Management Symposium      7 disciplines
--   FO   — Financial Open            6 disciplines
--   HM   — Happening Marketing       7 disciplines
--   plus stock-market-simulation and cfa-ethics-challenge, which are subject
--        areas rather than event formats
--
-- Those 22 rows are inserted here. The 11 existing disciplines are NOT touched:
-- no row for 'finance', 'marketing', 'hr', 'tax', 'accounting', 'strategy',
-- 'digital-strategy', 'entrepreneurship', 'pom', 'sustainability' or
-- 'international' appears below, so 20260828000004's retune stands as shipped.
--
-- THE SAME THREE RULES AS 20260828000004, because matchDisciplines() is still a
-- plain case-insensitive substring test over `title + description`:
--
--   1. No short bare tokens. Rejected while writing this file: 'cio'
--      ("precious", "conscious"), 'chro' ("chrome", "chronic"), 'erp'
--      ("interpret"), 'agile' ("fragile"), 'irr' ("mirror"), 'cac' ("cache"),
--      'rpa' ("sherpa"), 'aor' ("aorta"), 'vat' ("private"), 'lbo' ("elbow"),
--      'persona' ("personal"), 'rally' ("generally"), 'tam' ("stamp"), 'sem'
--      ("semester"), 'sme' ("assessment") and 'seo' ("Seoul", which a business
--      desk writes often). Each is spelled out instead — 'chief information
--      officer', 'agile delivery', 'agency of record', 'value-added tax',
--      'buyer persona', 'smes', 'search engine optimization'. The seed's
--      'CRA'/"aircraft" bug is the reason this list exists.
--   2. Prefer the stem. 'refinanc' catches refinance and refinancing; 'digitiz'
--      plus 'digitis' covers both spellings; 'acquir' catches acquire, acquires,
--      acquired and acquiring in one phrase.
--   3. Spell both dialects. 'organizational change' and 'organisational change',
--      'localization' and 'localisation', 'labour relations' and 'labor
--      relations', 'amortization' and 'amortisation'.
--
-- The vocabulary is the registered sources' own, not consulting-report phrasing
-- — see the postscript on 20260828000003. Marketing Dive writes "retail media"
-- and "cookie deprecation"; CFO Dive writes "capex" and "credit facility";
-- Journal of Accountancy writes "lease accounting" and "going concern"; Tax
-- Foundation writes "pillar two" and "excise".
--
-- Several of these are narrow slices of an existing discipline — 'taxation'
-- under 'tax', 'financial-accounting' under 'accounting', 'digital-marketing'
-- under 'marketing'. That overlap is intended, not a defect: matchDisciplines
-- returns every hit, and a story about lease accounting is legitimately both.
--
-- TWO KNOWN TRADE-OFFS, recorded so the next person does not "fix" them blind:
--
--   * 'acquisition' in mergers-acquisitions also fires on "customer
--     acquisition" and "talent acquisition". Recall wins over precision here:
--     trade press writes "announces the acquisition" as often as "acquires",
--     and the stem 'acquir' alone would miss it. The false positives land on a
--     discipline where a delegate can see at a glance that they do not belong.
--   * 'b2b-marketing' is INVISIBLE to src/lib/ingest/topics.test.ts. That test
--     lifts keyword arrays out of migration SQL with /\('([a-z-]+)',…/, and the
--     digit in "b2b" is outside [a-z-], so the regex skips the row and resumes
--     cleanly at the next one. Nothing breaks — ingest reads Postgres, not this
--     file, and the row inserts normally — but the set is unpinned by tests.
--     The slug is the competition's, so widening the test regex to [a-z0-9-]
--     is the fix if that set ever needs coverage. Not done here: this migration
--     does not touch existing files.
-- ─────────────────────────────────────────────────────────────────────────────

insert into news_discipline_topics (discipline, keywords, updated_by) values

  -- ═══ SMNG — Management Symposium ═══════════════════════════════════════════

  ('human-resource-management', array[
    'human resource','chief people officer','workforce planning','employment standards',
    'employee relations','labour relations','labor relations','collective bargaining',
    'collective agreement','grievance','performance management','succession planning',
    'total rewards','pay equity','pay transparency','employee benefits','workplace safety',
    'absenteeism','hiring freeze','union drive','harassment policy','workplace accommodation',
    'employee handbook','job classification'
  ], 'seed'),

  ('change-management', array[
    'change management','organizational change','organisational change','change initiative',
    'culture change','transformation program','management shake-up','reorganization',
    'reorganisation','restructuring plan','operating model','turnaround plan','downsizing',
    'rightsizing','change leadership','employee resistance','workforce transition',
    'integration plan','transition plan','realignment','new chief executive','staff morale'
  ], 'seed'),

  ('digital-transformation', array[
    'digital transformation','it modernization','it modernisation','legacy system',
    'cloud migration','erp implementation','erp system','core system replacement','digitiz',
    'digitis','process automation','workflow automation','generative ai','data platform',
    'technology roadmap','system integration','chief information officer','digital adoption',
    'low-code','tech stack','platform migration','paperless'
  ], 'seed'),

  ('project-management', array[
    'project management','project manager','project delivery','megaproject','cost overrun',
    'over budget','behind schedule','project timeline','capital project','construction project',
    'project scope','scope creep','critical path','gantt','project portfolio','risk register',
    'stage-gate','deliverable','project team','schedule delay','kanban','scrum master',
    'change order','agile delivery'
  ], 'seed'),

  ('mergers-acquisitions', array[
    'merger','acquisition','acquir','m&a','takeover','hostile bid','stalking horse',
    'due diligence','deal value','dealmaking','target company','definitive agreement',
    'all-cash deal','antitrust review','competition bureau','regulatory approval','divestiture',
    'carve-out','asset purchase','deal premium','shareholder vote','earnout',
    'letter of intent','break fee','synergies'
  ], 'seed'),

  ('management-of-smes', array[
    'small business','small-business','smes','small and medium','small and mid-sized',
    'family business','family-owned','owner-operator','independent business','business owner',
    'chamber of commerce','business succession','franchisee','franchising','sole proprietor',
    'small firm','small manufacturer','main street business','business development bank',
    'microbusiness','mom-and-pop','local business'
  ], 'seed'),

  ('market-targeting', array[
    'market segmentation','target market','target audience','targeting','positioning',
    'buyer persona','customer persona','customer profile','customer segment','audience segment',
    'addressable market','market sizing','demographic','psychographic','niche market',
    'consumer insights','first-party data','lookalike audience','contextual advertising',
    'audience data','share of wallet','ideal customer'
  ], 'seed'),

  -- ═══ FO — Financial Open ═══════════════════════════════════════════════════

  ('personal-finance', array[
    'personal finance','household debt','household budget','mortgage rate','retirement savings',
    'rrsp','tfsa','credit card debt','student loan','savings account','first-time homebuyer',
    'financial literacy','cost of living','consumer credit','credit score','pension plan',
    'housing affordability','wealth management','robo-advisor','consumer insolvency',
    'line of credit','debt-to-income','retirement income'
  ], 'seed'),

  ('corporate-finance', array[
    'corporate finance','capital allocation','cost of capital','leverage ratio','refinanc',
    'credit facility','term loan','covenant','bond issuance','share buyback','dividend policy',
    'free cash flow','ebitda','capital expenditure','capex','working capital',
    'corporate treasury','chief financial officer','net debt','private credit','capital raise',
    'equity offering','liquidity'
  ], 'seed'),

  ('financial-markets', array[
    'stock market','equity markets','bond yield','bond market','tsx','nasdaq','s&p 500',
    'dow jones','index fund','exchange-traded fund','volatility','trading volume','bull market',
    'bear market','sell-off','short selling','central bank','bank of canada','federal reserve',
    'treasury yield','commodity prices','foreign exchange','investor sentiment',
    'market correction','benchmark index'
  ], 'seed'),

  ('taxation', array[
    'taxation','tax filing','tax season','tax return','tax compliance','tax audit',
    'tax deduction','tax treaty','transfer pricing','value-added tax','value added tax',
    'excise','withholding tax','payroll tax','corporate tax rate','tax avoidance','tax evasion',
    'tax court','canada revenue agency','internal revenue service','global minimum tax',
    'pillar two','carbon tax','property tax','taxpayer'
  ], 'seed'),

  ('financial-accounting', array[
    'financial statement','balance sheet','income statement','cash flow statement',
    'revenue recognition','ifrs','gaap','fasb','iasb','lease accounting','goodwill impairment',
    'fair value','consolidated financial','accrual','deferred revenue','write-down',
    'restatement','disclosure requirement','auditor','going concern','earnings per share',
    'annual report','depreciation','amortization','amortisation'
  ], 'seed'),

  ('management-accounting', array[
    'management accounting','cost accounting','budgeting','variance analysis','cost allocation',
    'standard costing','activity-based costing','overhead cost','unit economics','gross margin',
    'operating margin','contribution margin','break-even','cost per unit','rolling forecast',
    'financial planning and analysis','fp&a','cost control','cost cutting','cost savings',
    'pricing strategy','profitability','margin pressure'
  ], 'seed'),

  -- ═══ HM — Happening Marketing ══════════════════════════════════════════════

  ('strategic-marketing', array[
    'brand strategy','marketing strategy','brand positioning','go-to-market','product launch',
    'brand equity','competitive positioning','brand portfolio','marketing mix',
    'customer lifetime value','marketing plan','share of voice','brand refresh',
    'value proposition','chief marketing officer','brand architecture','category growth',
    'market share','rebrand','brand purpose','marketing budget','positioning strategy'
  ], 'seed'),

  ('experiential-marketing', array[
    'experiential marketing','brand activation','pop-up shop','pop-up store','event marketing',
    'sponsorship','trade show','immersive experience','fan experience','live event',
    'sampling campaign','guerrilla marketing','experiential campaign','naming rights',
    'title sponsor','brand experience','in-store experience','retail experience',
    'roadshow','consumer activation','flagship store','marketing stunt','festival sponsor'
  ], 'seed'),

  ('digital-marketing', array[
    'digital marketing','programmatic','paid search','search engine optimization',
    'search engine optimisation','organic search','social media marketing','influencer marketing',
    'retail media','connected tv','email marketing','marketing automation','martech','adtech',
    'ad tech','first-party data','third-party cookie','cookie deprecation','conversion rate',
    'click-through','display advertising','paid social','google ads','attribution model',
    'performance marketing'
  ], 'seed'),

  ('b2b-marketing', array[
    'b2b','business-to-business','account-based marketing','lead generation',
    'demand generation','sales pipeline','buying committee','channel partner','enterprise sales',
    'sales enablement','crm','lead qualification','white paper','webinar','trade show',
    'sales cycle','customer success','net revenue retention','distributor network',
    'industrial marketing','enterprise buyer','contract renewal'
  ], 'seed'),

  ('international-marketing', array[
    'international marketing','global brand','global campaign','market entry','localization',
    'localisation','cross-border','emerging markets','global expansion','export market',
    'multinational','cultural adaptation','global rollout','international expansion',
    'overseas market','foreign market','regional campaign','global media','worldwide launch',
    'international consumer','global marketing'
  ], 'seed'),

  ('hr-marketing', array[
    'employer brand','hiring manager','employee value proposition','talent attraction',
    'recruitment marketing','candidate experience','career site','job posting','glassdoor',
    'employee advocacy','talent brand','employer of choice','best places to work',
    'internal communications','employee engagement','workplace culture','hiring campaign',
    'job seeker','talent pipeline','onboarding experience','employee experience','recruiter'
  ], 'seed'),

  ('request-for-agency-proposal', array[
    'request for proposal','rfp','agency review','agency search','agency pitch','account review',
    'agency of record','media agency','creative agency','pitch process','incumbent agency',
    'competitive pitch','creative brief','agency brief','scope of work','vendor selection',
    'pitch consultant','agency roster','media review','account win','wins the account',
    'agency retainer'
  ], 'seed'),

  -- ═══ Subject areas, not event formats ══════════════════════════════════════

  ('stock-market-simulation', array[
    'portfolio management','asset allocation','trading strategy','stock picking','hedging',
    'derivatives','options trading','futures contract','short position','long position',
    'margin call','market volatility','trading desk','index fund','risk-adjusted return',
    'sharpe ratio','portfolio rebalancing','brokerage','day trading','market maker','bid-ask',
    'circuit breaker','equity trading','stock portfolio'
  ], 'seed'),

  ('cfa-ethics-challenge', array[
    'cfa institute','code of ethics','best execution','fiduciary duty',
    'conflict of interest','insider trading','material nonpublic information',
    'material non-public information','professional conduct','misrepresentation',
    'client confidentiality','ethics violation','securities regulator',
    'ontario securities commission','finra','enforcement action','compliance failure',
    'whistleblower','market manipulation','front-running','investment adviser',
    'duty of loyalty','suitability','regulatory sanction'
  ], 'seed')

-- Same guard as 20260828000004: only rows no human has touched. The seed writes
-- updated_by='seed'; a coach editing through the Portal writes their own
-- identifier, and this leaves those alone. news_discipline_topics is shared with
-- jmcc-portal, so a migration must never clobber a coach's tuning.
on conflict (discipline) do update
   set keywords   = excluded.keywords,
       updated_by = excluded.updated_by,
       updated_at = now()
 where news_discipline_topics.updated_by = 'seed';
