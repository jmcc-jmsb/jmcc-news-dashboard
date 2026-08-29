// ABOUTME: Seed article and report data from the prototype — the Sprint 0/1 fixture set.
// ABOUTME: Source names are ALREADY normalized; lib/ingest/normalize.ts must reproduce this mapping.

import type { DisciplineId, FeedItem } from './types';
import { DISCIPLINES } from './disciplines';
import { h } from './format';
import { isAiRelevant } from './ingest/ai-relevance';

/* Rows are [title, source, publishedAt, description]. Kept as tuples rather
   than objects because that is how the prototype shipped them and the shape is
   dense enough to scan — this is test data, not a model.

   The source names here are the canonical normalization target (brief §10):
   'WSJ' not 'Wall Street Journal', 'Globe and Mail' not 'The Globe and Mail',
   'BNN Bloomberg' not 'BNN'. No French-language outlets appear, by design. */
type ArticleRow = [title: string, source: string, publishedAt: string, description: string];
type ReportRow = [source: string, title: string, publishedAt: string, description: string];

const ARTICLES_RAW: Partial<Record<DisciplineId, ArticleRow[]>> = {
  'finance': [
    ['BoC holds rate at 2.75%, signals patience as core inflation eases', 'Globe and Mail', '2026-05-22T13:14:00Z', 'The Bank of Canada paused for a second meeting, citing a softer Q1 GDP print and shelter inflation that finally cooled to 3.1% year-over-year.'],
    ['Fed minutes show split committee on timing of next cut', 'Reuters', '2026-05-22T09:02:00Z', 'Three FOMC members favored a June cut while a hawkish bloc warned that services inflation remains sticky above the 2% target.'],
    ['Apollo closes $25B private credit fund, largest of 2026', 'Bloomberg', '2026-05-21T18:40:00Z', 'The fund will target middle-market direct lending in North America as banks continue to retrench from leveraged loans.'],
    ['CN Rail beats Q1 EPS by $0.18, raises full-year guidance', 'Financial Post', '2026-05-21T11:30:00Z', 'Volume growth in intermodal and a weaker loonie helped CN deliver an operating ratio of 58.4%, the best in a decade.'],
    ['10-year Treasury yield falls below 4.0% on weak retail sales', 'WSJ', '2026-05-20T20:11:00Z', 'Headline retail sales contracted 0.3% MoM, triggering a flight-to-safety rally across the curve.'],
    ['Brookfield reportedly in talks to acquire Spanish toll roads', 'FT', '2026-05-20T08:45:00Z', 'A €6.5B deal would mark Brookfield Infrastructure’s largest European acquisition since 2021.'],
    ['CDPQ reports 9.4% return for 2025, infrastructure leads', 'Globe and Mail', '2026-05-19T15:00:00Z', 'Net assets at the Caisse climbed to $497B, with private equity and infrastructure outperforming public equities.'],
    ['BMO economics flags rising Canadian household leverage', 'BNN Bloomberg', '2026-05-19T07:22:00Z', 'Debt-to-disposable income ticked back up to 176% as mortgage renewals push payments higher.'],
    ['Carlyle’s new credit chief targets opportunistic real estate', 'PitchBook', '2026-05-18T17:10:00Z', 'The firm is raising a $4B vehicle focused on stressed office and multifamily.'],
    ['Tariff uncertainty pushes CFOs to extend cash runways', 'CFO Dive', '2026-05-18T12:00:00Z', 'A new Deloitte survey finds 62% of CFOs are delaying capex pending tariff clarity.'],
    ['Goldman lifts S&P 500 year-end target to 6,400', 'CNBC', '2026-05-17T14:34:00Z', 'Strategists cite resilient earnings and falling real yields as supporting risk assets.'],
    ['IPO pipeline thaws: Stripe, Klarna eyeing Q3 listings', 'TechCrunch', '2026-05-17T10:00:00Z', 'Investment bankers say the window is the most open it has been since early 2021.'],
  ],
  'accounting': [
    ['IASB finalizes IFRS 18 amendments on operating profit reporting', 'Accounting Today', '2026-05-22T10:00:00Z', 'New presentation rules will require explicit categorization of operating, investing, and financing income for fiscal years beginning 2027.'],
    ['PCAOB sanctions Big Four firm $5M for audit deficiencies', 'WSJ', '2026-05-21T16:20:00Z', 'The action covers 27 audits between 2022 and 2024, citing failures in revenue and ICFR testing.'],
    ['CPA Canada releases revised sustainability assurance guide', 'CPA Canada', '2026-05-20T14:00:00Z', 'The guidance aligns with ISSA 5000 and clarifies practitioner expectations for limited vs. reasonable assurance.'],
    ['FASB to revisit goodwill amortization for private companies', 'Journal of Accountancy', '2026-05-19T11:30:00Z', 'The board reopened the project after preparer feedback on impairment cost.'],
    ['SEC pushes back on segment reporting interpretation', 'Bloomberg Tax', '2026-05-18T09:00:00Z', 'New staff guidance narrows the use of "other" categories in segment disclosures.'],
    ['Deloitte rolls out generative-AI audit workpaper tool', 'Accounting Today', '2026-05-17T13:00:00Z', 'The platform will be available to all US audit teams by fiscal year-end 2026.'],
    ['IRS finalizes corporate AMT regulations', 'Bloomberg Tax', '2026-05-16T17:15:00Z', 'Final rules clarify treatment of foreign earnings and depreciation for the 15% minimum tax.'],
    ['Crypto firms face new fair-value reporting under ASU 2026-03', 'CoinDesk', '2026-05-15T08:20:00Z', 'Issuers must mark digital assets at fair value through net income beginning Q1 2027.'],
  ],
  'tax': [
    ['Canada extends digital services tax pause through 2027', 'Globe and Mail', '2026-05-22T08:00:00Z', 'Ottawa cites OECD Pillar One progress as justification for the delay.'],
    ['IRS issues final rules on corporate alternative minimum tax', 'Reuters', '2026-05-21T15:00:00Z', 'The regulations finalize calculations for the 15% CAMT enacted under the Inflation Reduction Act.'],
    ['EU council adopts Unshell directive against shell entities', 'Tax Notes', '2026-05-20T12:40:00Z', 'Member states have until December 2026 to transpose the rules into national law.'],
    ['Pillar Two: Quebec aligns minimum-tax filings with federal regime', 'Bloomberg Tax', '2026-05-19T09:00:00Z', 'Filers can submit consolidated GIR with federal returns starting tax year 2026.'],
    ['CRA flags increase in transfer pricing audits for mid-market', 'Tax Foundation', '2026-05-18T14:00:00Z', 'Audit notices to firms under $250M revenue rose 38% year-over-year.'],
    ['Trump tax bill includes 100% bonus depreciation revival', 'Bloomberg Tax', '2026-05-17T11:00:00Z', 'House Ways & Means draft would extend full expensing through 2029.'],
    ['OECD Pillar One stalls again as US Senate signals opposition', 'FT', '2026-05-16T18:30:00Z', 'A bipartisan letter calls the digital services revenue allocation "unworkable" in current form.'],
    ['UK closes IR35 loophole, hits contractor structures', 'Accountancy Age', '2026-05-15T10:00:00Z', 'HMRC tightens rules for personal service companies with offshore intermediaries.'],
  ],
  'marketing': [
    ['Cookie deprecation deadline finally hits — what changes today', 'AdAge', '2026-05-22T12:00:00Z', 'Chrome rolled out third-party cookie blocking to 100% of users, ending a five-year transition.'],
    ['Brand purpose backlash: study finds 54% of consumers skeptical', 'Marketing Week', '2026-05-21T09:30:00Z', 'New Kantar research shows "purpose fatigue" is reshaping how brands position values campaigns.'],
    ['Retail media networks projected to hit $200B globally by 2027', 'eMarketer', '2026-05-20T11:15:00Z', 'Amazon Ads, Walmart Connect, and Loblaw Media drive the bulk of growth.'],
    ['TikTok Shop launches in Quebec ahead of holiday season', 'Strategy Online', '2026-05-19T08:45:00Z', 'Local creators will gain commission tools as TikTok pushes deeper into commerce.'],
    ['CMOs rebalance: programmatic shifts back toward direct deals', 'AdWeek', '2026-05-18T16:00:00Z', 'A new IAB report shows 71% of brands plan to increase direct-publisher spend in 2026.'],
    ['Loyalty programs see record engagement post-AI personalization', 'Forrester', '2026-05-17T13:00:00Z', 'Members of AI-personalized loyalty programs redeem 2.4× more often than control groups.'],
    ['DTC brands consolidate to physical retail to find margin', 'Modern Retail', '2026-05-16T10:00:00Z', 'Allbirds, Warby Parker, and Glossier each opened net-new stores in Q1.'],
    ['Apple privacy update further restricts attribution windows', 'Marketing Brew', '2026-05-15T14:30:00Z', 'iOS 19 reduces SKAdNetwork postbacks from 24h to 6h, complicating MMM models.'],
  ],
  'strategy': [
    ['Why scale economies are dying — and what to do about it', 'HBR', '2026-05-22T11:00:00Z', 'A new framework argues that AI is collapsing the cost advantages that once protected incumbents.'],
    ['Boeing names new CEO, signals strategic divestitures', 'WSJ', '2026-05-21T14:00:00Z', 'The new chief is expected to spin off defense and services within 18 months.'],
    ['Activist investor Elliott targets Honeywell with breakup plan', 'Bloomberg', '2026-05-20T09:20:00Z', 'Elliott’s $5B stake makes it among the top three holders.'],
    ['The unbundling of grocery: micro-fulfillment’s second act', 'McKinsey', '2026-05-19T10:00:00Z', 'After early hype, vertical-format MFCs are finally hitting unit economics.'],
    ['Why Saudi Aramco quietly bought a stake in Rivian', 'FT', '2026-05-18T08:15:00Z', 'The deal is part of a broader strategic shift toward downstream chemicals and mobility.'],
    ['LVMH reorganizes watch division as growth slows', 'Reuters', '2026-05-17T12:30:00Z', 'Bvlgari, TAG Heuer, and Hublot are being consolidated under a single president.'],
    ['Conglomerate discount narrows as breakup wave gains pace', 'BCG', '2026-05-16T15:00:00Z', 'A study of 47 spin-offs since 2020 shows median 18% TSR outperformance.'],
    ['Strategy under uncertainty: scenario planning makes a comeback', 'Strategy+Business', '2026-05-15T11:00:00Z', 'Why old-school scenarios are beating real-options for tariff and geopolitical risk.'],
  ],
  'digital-strategy': [
    ['Anthropic launches enterprise agent platform for $250B market', 'The Information', '2026-05-22T07:30:00Z', 'Claude Agents for Work integrates with Salesforce, ServiceNow, and Microsoft 365.'],
    ['Shopify reorganizes around AI commerce as merchants adopt agents', 'TechCrunch', '2026-05-21T13:00:00Z', 'Tobi Lütke says 40% of merchants now run at least one agentic workflow.'],
    ['Why platform companies are buying their suppliers back', 'A16Z', '2026-05-20T10:00:00Z', 'Vertical integration is back in vogue as AI compresses the value chain.'],
    ['CIBC migrates core banking to private cloud — at last', 'IT World Canada', '2026-05-19T15:00:00Z', 'A five-year program winds down with the retirement of legacy COBOL workloads.'],
    ['OpenAI launches business search, undercutting Glean', 'The Information', '2026-05-18T08:00:00Z', 'Enterprise pricing starts at $35/user/month with native Slack and Confluence connectors.'],
    ['Why digital transformation budgets are flat for the first time', 'CIO', '2026-05-17T09:30:00Z', 'Gartner says CIOs are reallocating to AI without growing total spend.'],
    ['Klarna’s AI rollback: what went wrong', 'TechCrunch', '2026-05-16T16:00:00Z', 'After two years of automation, the fintech is rehiring customer-service humans.'],
    ['Stripe Atlas adds AI-first incorporation flow', 'TechCrunch', '2026-05-15T11:30:00Z', 'Founders can now incorporate, register for tax, and set up payments in under 10 minutes.'],
  ],
  'entrepreneurship': [
    ['Y Combinator W26 batch hits record 240 startups, 88% AI-native', 'TechCrunch', '2026-05-22T14:00:00Z', 'YC reports application volume up 4× from a year ago as solo-founder AI startups dominate.'],
    ['Canadian seed valuations rebound to 2021 levels', 'BetaKit', '2026-05-21T10:15:00Z', 'Median seed valuation hit $14M in Q1, up 35% YoY, led by AI infrastructure deals.'],
    ['Cohere lays off 12% as it refocuses on enterprise', 'The Logic', '2026-05-20T08:30:00Z', 'The Toronto AI company is doubling down on regulated industries.'],
    ['Why first-time founders are outraising serial founders in AI', 'a16z', '2026-05-19T13:00:00Z', 'Greenfield problem spaces favor builders with no incumbent assumptions.'],
    ['BDC closes $400M growth equity fund for late-stage Canadian companies', 'BNN Bloomberg', '2026-05-18T11:00:00Z', 'The fund targets check sizes of $20M–$60M in companies with $25M+ revenue.'],
    ['Toronto founder community pushes back on capital gains hike', 'Globe and Mail', '2026-05-17T09:00:00Z', 'An open letter signed by 600+ founders calls for stock-option carve-outs.'],
    ['Vertical SaaS in resi construction quietly hits $1B ARR', 'Sifted', '2026-05-16T16:00:00Z', 'Tools for trades and small contractors are the new mid-market darlings.'],
    ['How three students built a $30M ARR business in 18 months', 'TechCrunch', '2026-05-15T12:00:00Z', 'A McGill-spun-out AI compliance startup is one of YC’s fastest-growing alumni.'],
  ],
  'hr': [
    ['Return-to-office mandates correlate with 14% spike in attrition', 'HBR', '2026-05-22T10:30:00Z', 'A meta-analysis of 47 Fortune 500 RTO policies finds turnover concentrated in top performers.'],
    ['Pay transparency laws expand: Ontario joins NY and California', 'HR Reporter', '2026-05-21T08:00:00Z', 'Employers must post salary ranges on all job postings starting January 1, 2027.'],
    ['McKinsey says AI is reshaping 60% of knowledge-work roles', 'McKinsey', '2026-05-20T14:00:00Z', 'A new index measures task-level exposure across 850 occupations.'],
    ['Skills-based hiring overtakes credential-based at Fortune 1000', 'SHRM', '2026-05-19T11:30:00Z', '54% of large employers now use skills assessments as the primary screen.'],
    ['DEI backlash: 22% of US employers scaled back programs in 2025', 'WSJ', '2026-05-18T09:45:00Z', 'But peer-firm benchmarking shows quiet continuation under different names.'],
    ['Canada Labour Code updates strengthen gig-worker protections', 'CBC', '2026-05-17T13:00:00Z', 'Federally regulated platforms must offer benefits to workers logging 1,000+ annual hours.'],
    ['The four-day week, three years in: productivity holds, attrition drops 22%', 'Fast Company', '2026-05-16T11:00:00Z', 'A long-running UK pilot publishes its terminal report.'],
    ['Why HR functions are restructuring around skills graphs', 'Josh Bersin', '2026-05-15T16:30:00Z', 'A unified skills taxonomy is replacing job families at progressive companies.'],
  ],
  'pom': [
    ['Red Sea reroutes ease as Suez traffic returns to 80% of pre-2023', 'gCaptain', '2026-05-22T09:00:00Z', 'Container rates on Asia–Europe lanes have fallen 31% YTD as routing normalizes.'],
    ['Foxconn opens new $1.8B assembly plant in Saltillo, Mexico', 'Reuters', '2026-05-21T15:30:00Z', 'The facility will handle EV components for North American OEMs.'],
    ['CN, CP face renewed labor action after CIRB ruling', 'Globe and Mail', '2026-05-20T13:20:00Z', 'Conductors and engineers may legally strike beginning June 5.'],
    ['Nearshoring wave brings Mexico FDI to record $48B', 'Bloomberg', '2026-05-19T10:00:00Z', 'Q1 inflows hit a new high, with autos and electronics driving the surge.'],
    ['Why warehouse automation ROIs are stretching past 5 years', 'Supply Chain Dive', '2026-05-18T08:30:00Z', 'Volume softness and rising integration costs are slowing the AGV/AMR market.'],
    ['Tesla cuts shifts at Gigafactory Berlin on demand softness', 'Reuters', '2026-05-17T12:00:00Z', 'Model Y output drops 18% as European EV incentives wind down.'],
    ['Canadian Tire opens AI-powered DC in Calgary', 'Canadian Grocer', '2026-05-16T09:00:00Z', 'The 800k sq.ft. facility will use computer vision for inbound QA.'],
    ['Lean is dead, long live "responsive ops": new operating models post-tariff', 'BCG', '2026-05-15T14:00:00Z', 'Buffer stock is back as inventory turns trade off against fill rate.'],
  ],
  'sustainability': [
    ['ISSB to release biodiversity disclosure standard in Q3', 'Responsible Investor', '2026-05-22T08:30:00Z', 'The exposure draft will run to 90 days; final standard targeted for early 2027.'],
    ['Brookfield closes $20B climate transition fund II', 'Bloomberg', '2026-05-21T11:00:00Z', 'The fund will target grid-scale storage, transmission, and decarbonized industrial.'],
    ['Canada finalizes oil and gas emissions cap regulations', 'CBC', '2026-05-20T15:00:00Z', 'Sector must reduce emissions 35% below 2019 levels by 2030.'],
    ['BlackRock departs Net Zero Asset Managers initiative', 'FT', '2026-05-19T09:00:00Z', 'The world’s largest asset manager joins peers in stepping back from formal climate coalitions.'],
    ['EU CSRD enforcement begins: first wave of fines hits Q2', 'ESG Today', '2026-05-18T10:30:00Z', 'Regulators in Germany and France issued penalties for incomplete double-materiality disclosures.'],
    ['Carbon removal hits commercial scale: 1Mt delivered in 2025', 'CDR.fyi', '2026-05-17T13:00:00Z', 'But credit prices remain stubbornly high at $400+/ton.'],
    ['Quebec advances its $7B green hydrogen strategy', 'BNN Bloomberg', '2026-05-16T08:00:00Z', 'Hydro-Québec dedicates 1.5 GW of capacity to electrolysis projects.'],
    ['Sustainability reports get shorter as firms strip out marketing', 'GreenBiz', '2026-05-15T11:30:00Z', 'Median report length down 22% YoY as assurance scrutiny rises.'],
  ],
  'international': [
    ['US-China tariffs rise again as trade talks collapse', 'Reuters', '2026-05-22T07:00:00Z', 'A new round of 25% duties applies to semiconductors, EVs, and solar.'],
    ['EU and Mercosur ratify trade agreement after 25 years', 'FT', '2026-05-21T14:00:00Z', 'The deal opens the world’s fifth-largest economic bloc to European goods.'],
    ['India overtakes Japan as world’s third-largest economy', 'IMF', '2026-05-20T09:00:00Z', 'Nominal GDP for FY26 estimated at $4.4T.'],
    ['CUSMA review begins amid agricultural friction', 'Globe and Mail', '2026-05-19T11:00:00Z', 'Dairy supply management and softwood lumber remain sticking points.'],
    ['Canada signs critical minerals agreement with South Korea', 'BNN Bloomberg', '2026-05-18T08:30:00Z', 'The deal covers nickel, lithium, and graphite supply for EV batteries.'],
    ['Argentina’s currency overhaul enters second phase', 'WSJ', '2026-05-17T13:00:00Z', 'Capital controls lift further as inflation falls below 5% monthly.'],
    ['Japan’s yen hits 32-year low against USD before BOJ intervention', 'Nikkei', '2026-05-16T16:00:00Z', 'Officials confirmed $40B of yen-buying operations.'],
    ['Geopolitical risk premium pushes commodity vol higher', 'Goldman Sachs', '2026-05-15T10:00:00Z', 'A new index tracks freight rerouting and insurance cost surges across 12 chokepoints.'],
  ],

  // ── SMNG — Symposium en Management ──
  'human-resource-management': [
    ['Quebec grocery chain and union reach four-year deal after nine months of bargaining', 'Globe and Mail', '2026-05-22T14:20:00Z', 'The agreement lifts the starting wage to $21.50 an hour and converts 1,200 part-time roles to guaranteed 30-hour schedules.'],
    ['Federal pay-equity plans come due for 4,800 employers on June 30', 'CBC', '2026-05-22T08:10:00Z', 'Employers with more than 100 workers must post final plans or face administrative penalties of up to $50,000 per violation.'],
    ['Big Canadian banks split the chief people officer role in two', 'Financial Post', '2026-05-21T12:45:00Z', 'Talent strategy is moving under the COO while employee relations and labour files report directly to the CEO.'],
    ['Recruiters lean on AI tools as applications per posting hit 41', 'HBR', '2026-05-20T16:00:00Z', 'Median time-to-first-interview fell to six days, but audit teams flag that 1 in 5 employers never tested their models for adverse impact.'],
    ['Workforce planning shifts to quarterly cycles at 58% of large employers', 'Forrester', '2026-05-19T10:30:00Z', 'Annual headcount budgets are being replaced by rolling 18-month skills forecasts tied to project pipelines.'],
    ['US overtime threshold rises to $68,900, pulling in 3.1 million workers', 'WSJ', '2026-05-18T13:15:00Z', 'Employers have until January to reclassify salaried staff or raise base pay above the new exemption floor.'],
    ['Flight attendants at a Canadian carrier ratify a first contract covering ground time', 'Reuters', '2026-05-17T09:40:00Z', 'Unpaid boarding hours end in September, adding an estimated $34M a year to the airline’s labour costs.'],
    ['Manufacturers try compressed four-day weeks to hold onto skilled trades', 'Canadian Manufacturing', '2026-05-16T11:05:00Z', 'Plants running 10-hour shifts report millwright vacancies filling in 22 days versus 61 on a standard schedule.'],
  ],
  'change-management': [
    ['Telecom incumbent flattens five management layers to three', 'Globe and Mail', '2026-05-22T15:00:00Z', 'Roughly 700 director-level roles are being consolidated, with the average manager’s span of control rising from 4 reports to 11.'],
    ['Prairie utility’s restructuring cuts 900 head-office roles over two years', 'CBC', '2026-05-21T17:30:00Z', 'Field operations are untouched; the reduction lands entirely in shared services, procurement, and regional administration.'],
    ['Culture change programs stall without middle-manager incentives, study finds', 'MIT Sloan Management Review', '2026-05-21T09:15:00Z', 'Across 62 transformations, programs that tied 20% or more of manager bonuses to adoption metrics held gains three years out.'],
    ['Unilever folds its ice cream business into a standalone operating company', 'Reuters', '2026-05-20T12:00:00Z', 'The unit gets its own supply chain and finance function ahead of a listing decision expected before year-end.'],
    ['Change fatigue: employees now absorb 11 major initiatives a year', 'HBR', '2026-05-19T14:45:00Z', 'Self-reported willingness to support a new program has fallen to 38% from 74% in 2018, according to a survey of 9,400 workers.'],
    ['A Big Four firm rebuilds its consulting practice around sector pods', 'FT', '2026-05-18T08:20:00Z', 'Partners will be measured on sector P&L rather than service line, ending a capability-based structure that stood for 15 years.'],
    ['Transformation offices win budget authority at 34% of large firms', 'Knowledge at Wharton', '2026-05-17T15:10:00Z', 'Programs whose TMO controls the spend close initiatives 40% faster, though governance friction with finance rises sharply.'],
    ['Montreal manufacturer merges two plants onto one operating model after an 18-month pilot', 'Canadian Manufacturing', '2026-05-15T13:00:00Z', 'Standardized shift handovers and a single maintenance calendar cut unplanned downtime by 17% at the pilot site.'],
  ],
  'digital-transformation': [
    ['Canadian insurer retires a 40-year-old policy administration mainframe', 'IT World Canada', '2026-05-22T11:40:00Z', 'The final cutover moved 2.3 million in-force policies over a single weekend, closing a program that ran six years and $410M.'],
    ['SAP support deadline pushes mid-market ERP replacements into 2027', 'CIO Dive', '2026-05-22T06:50:00Z', 'Integrators say implementation slots for firms under $500M in revenue are now booked 11 months out.'],
    ['ERP vendors bundle agentic workflows into core finance modules', 'CIO Dive', '2026-05-21T14:05:00Z', 'Agents can now clear three-way match exceptions without a human touch, though most buyers are capping approval authority at $5,000.'],
    ['Credit union group moves core banking to the cloud in a phased cutover', 'Banking Dive', '2026-05-20T09:25:00Z', 'Twelve member institutions migrate in waves through 2027, with deposits and lending split across separate release trains.'],
    ['A provincial health authority’s records migration slips to a third attempt', 'CBC', '2026-05-19T17:00:00Z', 'Clinicians will keep dual-entering into the legacy chart until at least spring, adding an estimated 40 minutes a shift.'],
    ['COBOL skills shortage pushes public-sector teams toward code translation tools', 'IT World Canada', '2026-05-18T10:35:00Z', 'Federal departments report an average maintainer age of 54 on systems that still process benefits payments nightly.'],
    ['Retailers rebuild point-of-sale stacks around headless commerce', 'Retail Dive', '2026-05-17T08:00:00Z', 'Decoupling the till from the catalogue lets chains push price changes to 900 stores in under four minutes.'],
    ['Manufacturer’s MES rollout cuts changeover time 22% across nine plants', 'Manufacturing Dive', '2026-05-15T16:20:00Z', 'Line operators now get work instructions on tablets, replacing binders that were revised on a six-week cycle.'],
  ],
  'project-management': [
    ['Ontario transit extension runs $2.4B over budget as tunnelling slows', 'Globe and Mail', '2026-05-22T12:30:00Z', 'Unexpected soil conditions on a 3-km segment cut boring rates to 8 metres a day from a planned 18.'],
    ['West coast LNG expansion hits mechanical completion four months early', 'BNN Bloomberg', '2026-05-21T16:45:00Z', 'Modular fabrication offshore let the owner compress on-site labour hours by roughly 1.1 million.'],
    ['Cost overruns average 34% across Canadian infrastructure megaprojects', 'Financial Post', '2026-05-21T07:55:00Z', 'A review of 88 projects over $500M finds schedule slip, not scope growth, drives two-thirds of the variance.'],
    ['Owners shift to progressive design-build to curb change orders', 'Canadian Manufacturing', '2026-05-20T14:10:00Z', 'Bringing the contractor in before 30% design cut change-order volume by half on early adopters’ capital programs.'],
    ['Schedulers pilot machine-learning risk models to flag slipping critical paths', 'CIO Dive', '2026-05-19T09:05:00Z', 'The models read daily field reports and weather data, surfacing at-risk activities about three weeks before a human scheduler would.'],
    ['Hydro utility adds a 14-month contingency window to a dam refurbishment', 'CBC', '2026-05-18T15:40:00Z', 'The revised plan holds the $3.8B budget by deferring two of five turbine rebuilds into a later capital cycle.'],
    ['US chip fab construction timelines stretch to 39 months', 'Reuters', '2026-05-17T11:20:00Z', 'Electrical trades shortages in Arizona and Ohio are adding roughly seven months versus 2021 benchmarks.'],
    ['PMO headcount falls as capital budgets tighten at mid-cap firms', 'CFO Dive', '2026-05-16T08:45:00Z', 'Nearly a third of surveyed CFOs have merged project governance into finance rather than fund a standalone office.'],
  ],
  'mergers-acquisitions': [
    ['Global M&A volume reaches $1.6T in the first five months of 2026', 'Bloomberg', '2026-05-22T16:10:00Z', 'Deals above $10B account for 41% of value, the highest concentration since 2015, as mid-market activity stays subdued.'],
    ['Hostile bid for a Canadian mid-cap miner goes straight to shareholders', 'Reuters', '2026-05-22T10:25:00Z', 'The bidder is offering a 31% premium and has set a 105-day deposit period after the board rejected two prior approaches.'],
    ['Private equity buyer walks away after diligence finds an inventory gap', 'PitchBook', '2026-05-21T13:35:00Z', 'A $780M take-private collapsed when a physical count came in 9% below the carrying value in the data room.'],
    ['Grocery distributor divests its foodservice arm for $900M', 'Financial Post', '2026-05-20T18:00:00Z', 'Proceeds go to deleveraging, taking net debt to EBITDA from 4.1x to a targeted 2.8x by fiscal year-end.'],
    ['Cross-border deals face longer Investment Canada Act reviews', 'Globe and Mail', '2026-05-20T07:40:00Z', 'Average national-security screening now runs 128 days, up from 79 in 2024, with critical minerals drawing the most scrutiny.'],
    ['Take-private volume in Canadian tech doubles year over year', 'BetaKit', '2026-05-19T12:15:00Z', 'Eleven listed companies have agreed to go private in 2026, most trading below their 2021 IPO price at the time of the bid.'],
    ['Earnouts appear in 41% of mid-market deals as valuation gaps persist', 'CFO Dive', '2026-05-18T09:50:00Z', 'Median earnout period stretched to 30 months, and roughly a quarter now hinge on retention rather than revenue.'],
    ['Japanese trading house raises its stake in a Canadian potash venture', 'Nikkei', '2026-05-16T14:30:00Z', 'The additional 12% costs about US$1.4B and secures offtake for two fertilizer blending plants in Southeast Asia.'],
  ],
  'management-of-smes': [
    ['Small-business loan approvals slip to 58% at the big six banks', 'Financial Post', '2026-05-22T13:05:00Z', 'Rejections cluster among firms under five years old, pushing more owners toward fintech lenders charging 14% to 19%.'],
    ['Family-owned Quebec bakery chain completes succession to a third generation', 'Globe and Mail', '2026-05-21T10:40:00Z', 'The transfer used an estate freeze and a five-year earn-in, keeping all 340 employees and 22 storefronts intact.'],
    ['Minimum wage indexation in October squeezes SME payroll budgets', 'CBC', '2026-05-20T15:25:00Z', 'Restaurant operators say the 3.4% increase lands the same quarter as a scheduled hike in employer EI premiums.'],
    ['Owner-operators adopt AI-driven bookkeeping, cutting month-end from five days to one', 'Accounting Today', '2026-05-19T08:35:00Z', 'Automated bank-feed categorization is doing the work small firms previously bought in eight hours of bookkeeper time a month.'],
    ['BDC survey finds 44% of SMEs delaying equipment purchases', 'BNN Bloomberg', '2026-05-18T16:50:00Z', 'Tariff uncertainty tops the list of reasons cited, ahead of borrowing costs for the first time in the survey’s history.'],
    ['Independent retailers band together on shared warehousing and delivery', 'Retail Dive', '2026-05-17T13:45:00Z', 'A 60-store buying group cut last-mile cost per parcel to $6.10 from $9.40 by pooling volume with a regional 3PL.'],
    ['US small-business optimism index falls three points on input costs', 'CNBC', '2026-05-16T10:15:00Z', 'The share of owners planning price increases in the next quarter reached 38%, the highest reading in two years.'],
    ['Ontario tightens franchise disclosure rules for small operators', 'Financial Post', '2026-05-15T09:30:00Z', 'Franchisors must now provide audited unit-level earnings claims or state plainly that none are being made.'],
  ],
  'market-targeting': [
    ['Retailers narrow loyalty segments from 40 to six to lift redemption', 'Retail Dive', '2026-05-22T09:45:00Z', 'One national chain found that 34 of its micro-segments produced statistically identical offer responses.'],
    ['Buyer personas fall out of favour as brands move to jobs-to-be-done', 'Marketing Week', '2026-05-21T15:20:00Z', 'Agencies report that persona decks are being replaced by purchase-occasion maps built from transaction data.'],
    ['Canadian grocers target newcomer households with expanded international aisles', 'Marketing Dive', '2026-05-20T11:50:00Z', 'Stores in high-immigration postal codes are giving up to 18% of centre-store space to South Asian and West African lines.'],
    ['Streaming ad tiers segment on household composition, not age', 'eMarketer', '2026-05-19T16:35:00Z', 'Advertisers buying against household type report 23% lower cost per incremental reach than age-and-gender buys.'],
    ['Brands test AI-built micro-segments against hand-built clusters', 'Forrester', '2026-05-18T12:25:00Z', 'Machine-learning segments beat analyst clusters on conversion in 6 of 10 pilots, but marketers could not explain half of them to their CMOs.'],
    ['Positioning shift: value brands court higher-income shoppers', 'AdWeek', '2026-05-17T10:05:00Z', 'Households above $150,000 now account for 28% of discount-banner trips, up from 19% three years ago.'],
    ['B2B firms cut target account lists by a third to focus sales coverage', 'HBR', '2026-05-16T15:55:00Z', 'Teams that dropped below 200 named accounts per rep saw win rates climb four points within two quarters.'],
    ['Quebec advertisers redraw segment definitions for bilingual households', 'AdAge', '2026-05-15T08:15:00Z', 'Language of consumption, not language spoken at home, is becoming the split most media planners buy against.'],
  ],

  // ── FO — Omnium Financier ──
  'personal-finance': [
    ['Household debt-to-income climbs to 178% as the renewal wave peaks', 'Globe and Mail', '2026-05-22T12:40:00Z', 'Statistics Canada data show the ratio at its highest since 2022, driven by 2021-vintage mortgages resetting three points higher.'],
    ['Big-bank five-year fixed mortgage rates slip to 4.29%', 'Financial Post', '2026-05-22T08:15:00Z', 'Falling Government of Canada bond yields let lenders trim posted rates for the third time since March, though discounts have narrowed.'],
    ['RRSP contributions hit a record $61B while the median contribution falls', 'CBC', '2026-05-21T14:05:00Z', 'Aggregate savings rose on high-income filers, but the typical contributor put away $3,540, down 6% from the prior year.'],
    ['Credit card balances top $130B as delinquencies rise a fifth straight quarter', 'BNN Bloomberg', '2026-05-21T09:20:00Z', 'Equifax Canada puts the 90-day delinquency rate at 1.42%, with Ontario and Alberta accounting for most of the increase.'],
    ['TFSA limit expected to reach $8,000 for 2027 on indexation', 'Globe and Mail', '2026-05-20T13:00:00Z', 'The annual dollar limit is indexed to CPI and rounded to the nearest $500, which would lift cumulative room to $110,000.'],
    ['Student loan repayment assistance uptake jumps 22% year over year', 'CBC', '2026-05-19T16:30:00Z', 'More than 410,000 borrowers now make reduced or zero payments under the federal program, the highest enrolment on record.'],
    ['US savers tap 401(k) hardship withdrawals at a record pace', 'WSJ', '2026-05-18T11:45:00Z', 'Vanguard reports 4.1% of participants took a hardship distribution over the past year, roughly double the pre-2022 average.'],
    ['Grocery inflation keeps household budgets tight even as headline CPI cools', 'Reuters', '2026-05-16T10:10:00Z', 'Food purchased from stores rose 3.8% year over year against a 2.1% headline rate, squeezing the lowest income quintile hardest.'],
  ],
  'corporate-finance': [
    ['Investment-grade issuers price $48B of bonds ahead of the summer lull', 'Bloomberg', '2026-05-22T15:10:00Z', 'Order books were covered nearly four times, letting borrowers cut new-issue concessions to about three basis points.'],
    ['CFOs lift weighted average cost of capital assumptions above 9%', 'CFO Dive', '2026-05-22T11:00:00Z', 'A survey of 340 finance chiefs found hurdle rates rising faster than WACC, with a median 400 basis point spread.'],
    ['Canadian midstream operator refinances $2.1B term loan at 175 bps over SOFR', 'Financial Post', '2026-05-21T17:25:00Z', 'The seven-year facility replaces 2027 maturities and drops a total-leverage covenant in favour of a fixed-charge test.'],
    ['Covenant-lite share of leveraged loans slips to 82% as lenders push back', 'FT', '2026-05-21T07:50:00Z', 'Direct lenders competing with the broadly syndicated market are winning back maintenance covenants on smaller deals.'],
    ['Buybacks overtake dividends again as boards favour flexible payout', 'Reuters', '2026-05-20T14:20:00Z', 'Repurchase authorizations across North American large caps reached $290B in the quarter, the highest share of payout since 2018.'],
    ['Revolver renewals get shorter as banks price in tariff risk', 'Banking Dive', '2026-05-19T12:35:00Z', 'Three-year commitments are displacing five-year facilities for manufacturers with cross-border supply chains, bankers say.'],
    ['Treasury teams deploy AI driven cash forecasting to trim idle balances', 'CFO Dive', '2026-05-18T09:40:00Z', 'Early adopters report forecast error falling from 12% to under 5% at the 13-week horizon, freeing working capital for buybacks.'],
    ['Net leverage at Canadian mid-caps falls to 2.4x after two years of deleveraging', 'BNN Bloomberg', '2026-05-16T13:15:00Z', 'Lower debt loads leave issuers with capacity for acquisitions just as private-credit pricing becomes competitive with banks.'],
  ],
  'financial-markets': [
    ['TSX closes at a record 27,410 as energy and gold miners lead', 'BNN Bloomberg', '2026-05-22T20:30:00Z', 'The materials sub-index gained 2.8% on bullion above US$3,400 an ounce, extending the benchmark’s year-to-date advance to 11%.'],
    ['S&P 500 posts a fourth straight weekly gain despite thin breadth', 'CNBC', '2026-05-22T14:00:00Z', 'Fewer than 45% of index members trade above their 50-day moving average, a divergence strategists say usually precedes a pullback.'],
    ['Canada 10-year yield falls 11 basis points after a soft retail print', 'Reuters', '2026-05-21T19:05:00Z', 'Traders now price roughly 30 basis points of Bank of Canada easing by October, up from 15 basis points a week ago.'],
    ['VIX drops below 13 for the first time since January', 'Bloomberg', '2026-05-21T13:30:00Z', 'Realized volatility on the S&P 500 has run under 10 for three weeks, pushing the variance risk premium to a two-year low.'],
    ['Nasdaq rebalance forces $60B of index-fund trading into Friday’s close', 'WSJ', '2026-05-20T18:20:00Z', 'Capping rules will trim the five largest weights by a combined 6.5 points, with passive managers required to match at the print.'],
    ['Passive share of Canadian equity assets passes 42%', 'Globe and Mail', '2026-05-19T10:45:00Z', 'Index mandates absorbed $14B of net flows over twelve months while active domestic equity funds saw redemptions of $9B.'],
    ['Nikkei 225 tops 47,000 as yen weakness lifts exporters', 'Nikkei', '2026-05-18T06:15:00Z', 'The currency’s slide past 158 to the dollar added an estimated four percentage points to sector earnings guidance this quarter.'],
    ['Corporate bond spreads grind to 88 basis points, tightest since 2021', 'FT', '2026-05-16T15:50:00Z', 'Investment-grade buyers are accepting less compensation per turn of leverage than at any point in the post-pandemic cycle.'],
  ],
  'taxation': [
    ['CRA closes filing season with 3.1 million returns filed after the deadline', 'Financial Post', '2026-05-22T11:20:00Z', 'Late filers face 5% of balance owing plus 1% monthly, and the agency says interest arrears now accrue at 9%.'],
    ['IRS extends the e-filing mandate to partnerships with ten or more returns', 'Bloomberg Tax', '2026-05-21T15:40:00Z', 'The aggregation rule counts information returns across all types, pulling thousands of small partnerships into electronic filing for 2027.'],
    ['Transfer pricing documentation deadlines tighten for mid-market filers', 'Tax Notes', '2026-05-21T08:00:00Z', 'Contemporaneous documentation must now be in hand within 90 days of a request rather than the previous six-month window.'],
    ['CRA pilots machine-learning audit selection for GST/HST refund claims', 'CPA Canada', '2026-05-20T12:10:00Z', 'The model scores claims on 60 risk features, and practitioners want disclosure of how a flagged file can be contested.'],
    ['Home-office deduction claims fall 40% under stricter substantiation rules', 'Accounting Today', '2026-05-19T14:25:00Z', 'The end of the flat-rate method means employees must obtain a signed T2200 and apportion expenses by square footage.'],
    ['Canada-US treaty competent authority backlog stretches past 30 months', 'Bloomberg Tax', '2026-05-18T10:00:00Z', 'Double-taxation relief requests filed in 2023 remain unresolved, pushing more taxpayers toward advance pricing agreements instead.'],
    ['Making Tax Digital penalties start biting for late quarterly updates', 'Accountancy Age', '2026-05-17T09:15:00Z', 'HMRC issued first points-based penalties to sole traders above the GBP 50,000 threshold, with charges triggered at four points.'],
    ['IRS voluntary disclosure practice narrows eligibility for repeat filers', 'Journal of Accountancy', '2026-05-15T13:00:00Z', 'Taxpayers who used the program within the past six years are now presumptively excluded, and the civil fraud penalty framework stays.'],
  ],
  'financial-accounting': [
    ['IASB opens comment period on revised revenue disclosure requirements', 'Accounting Today', '2026-05-22T13:45:00Z', 'The exposure draft would require disaggregation of contract balances by duration, with comments due 30 September 2026.'],
    ['FASB narrows software cost capitalization under ASU 2026-05', 'Journal of Accountancy', '2026-05-22T09:30:00Z', 'The single-threshold model removes the development-stage distinction, and preparers expect more cost to hit the income statement immediately.'],
    ['Balance-sheet leases push reported liabilities up 14% at Canadian retailers', 'CFO Dive', '2026-05-21T12:50:00Z', 'Renewal options exercised at higher rents drove the increase, with several issuers restating right-of-use assets alongside it.'],
    ['Preparers split on where to land the new operating profit subtotal', 'CPA Canada', '2026-05-20T15:20:00Z', 'Classification of foreign exchange gains and pension finance cost is drawing the most inconsistent treatment in early IFRS 18 drafts.'],
    ['Revenue recognition for usage-based generative AI contracts vexes software filers', 'WSJ', '2026-05-19T17:00:00Z', 'Variable consideration tied to token consumption makes the constraint on estimates hard to apply, auditors and issuers both say.'],
    ['Non-GAAP adjustments reach 19% of reported earnings at S&P 500 issuers', 'Bloomberg', '2026-05-18T11:10:00Z', 'Stock compensation and restructuring together account for two-thirds of the gap between GAAP net income and adjusted figures.'],
    ['IFRS 19 cuts disclosure load for eligible subsidiaries in its first year', 'Accountancy Age', '2026-05-17T08:40:00Z', 'Early adopters report note counts down by roughly 40%, though group auditors still require the underlying data for consolidation.'],
    ['Goodwill balances reach $4.2T as impairment tests draw closer scrutiny', 'Reuters', '2026-05-15T14:00:00Z', 'Higher discount rates have narrowed headroom at reporting units acquired during the 2021 deal boom, analysts warn.'],
  ],
  'management-accounting': [
    ['Rolling forecasts overtake annual budgets at 58% of large manufacturers', 'CFO Dive', '2026-05-22T10:20:00Z', 'Firms cite input price volatility, with most now refreshing an 18-month horizon each quarter rather than locking a calendar plan.'],
    ['Tariff pass-through blows out purchase price variance at auto suppliers', 'Manufacturing Dive', '2026-05-21T14:15:00Z', 'Unfavourable material variances averaged 6.4% of standard cost last quarter, forcing mid-year updates to bill-of-material rates.'],
    ['Activity-based costing makes a comeback in warehouse operations', 'Supply Chain Dive', '2026-05-20T16:40:00Z', 'Cheap sensor data finally makes driver-level tracking practical, letting operators price pick-and-pack by handling unit rather than by weight.'],
    ['AI copilots cut month-end variance analysis from nine days to three', 'Accounting Today', '2026-05-20T08:30:00Z', 'Analysts review generated commentary instead of writing it, though controllers insist on human sign-off before anything reaches the board pack.'],
    ['Standard cost updates move to quarterly as input prices swing', 'Canadian Manufacturing', '2026-05-19T13:05:00Z', 'Plants that revalued inventory once a year are absorbing large true-up entries that distort quarterly gross margin.'],
    ['Unit economics discipline returns to SaaS boardrooms', 'HBR', '2026-05-18T12:00:00Z', 'Boards are asking for contribution margin per account rather than blended gross margin, exposing wide dispersion inside the same product line.'],
    ['Shared-service cost allocation disputes stall transformation programs', 'MIT Sloan Management Review', '2026-05-17T11:30:00Z', 'Business units reject headcount-based drivers when they cannot influence consumption, a pattern found across 24 studied programs.'],
    ['Zero-based budgeting revivals target SG&A rather than cost of goods', 'Journal of Accountancy', '2026-05-15T09:50:00Z', 'Second-wave adopters build a cost-category owner model, having learned that plant-level rebuilds rarely survive the first downturn.'],
  ],
  'stock-market-simulation': [
    ['Options volumes hit a record 62 million contracts a day on zero-day activity', 'Bloomberg', '2026-05-22T18:00:00Z', 'Same-day expiries now make up 56% of S&P 500 option volume, concentrating dealer gamma exposure into the final trading hour.'],
    ['Pensions trim the 60/40 toward 55/30/15 as private assets take a slice', 'Globe and Mail', '2026-05-22T10:50:00Z', 'Canadian plans surveyed hold a median 15% in private credit, infrastructure and real estate, up from 9% five years ago.'],
    ['Covered-call ETFs pull in $9B as investors chase distribution yield', 'BNN Bloomberg', '2026-05-21T16:00:00Z', 'Assets in Canadian-listed option-writing funds passed $40B, though low volatility has cut premium capture to roughly 60 basis points monthly.'],
    ['Execution desks lean on AI to cut implementation shortfall', 'Reuters', '2026-05-21T10:35:00Z', 'Machine learning schedulers adapt participation rates intraday, with early users reporting three to five basis points of savings on large orders.'],
    ['Momentum posts its best month since 2023 while value lags again', 'Goldman Sachs', '2026-05-20T09:25:00Z', 'The long-short momentum factor returned 4.7% in April, and crowding metrics now sit in the ninetieth percentile of their history.'],
    ['Crude futures curve flips to backwardation, squeezing short hedges', 'CNBC', '2026-05-19T15:45:00Z', 'Producers rolling forward sales face negative carry for the first time since 2024 as prompt spreads widen to US$1.20 a barrel.'],
    ['Currency hedge ratios on US equity exposure climb toward 50%', 'WSJ', '2026-05-18T14:20:00Z', 'Canadian institutions are raising hedges after the loonie’s rebound erased about three points of unhedged return over six months.'],
    ['Risk parity funds cut equity beta as realized volatility bottoms out', 'FT', '2026-05-16T11:05:00Z', 'Volatility-targeting strategies mechanically add leverage when calm persists, and estimates put current equity exposure near multi-year highs.'],
  ],
  'cfa-ethics-challenge': [
    ['CFA Institute updates guidance on AI model disclosure in client reporting', 'Reuters', '2026-05-22T14:30:00Z', 'Members using generative AI tools in research must document human review, with the standard framed under diligence and reasonable basis.'],
    ['CIRO fines a Toronto asset manager $1.2M over best-execution failures', 'Globe and Mail', '2026-05-22T09:00:00Z', 'The firm routed client orders to an affiliated venue without periodic review, and the settlement requires an independent execution audit.'],
    ['OSC consults on tightening personal trading pre-clearance windows', 'Financial Post', '2026-05-21T13:20:00Z', 'The proposal would shorten the validity of an approved employee trade from five days to one, aligning with several US buy-side policies.'],
    ['SEC charges a mid-market advisory firm over undisclosed revenue sharing', 'WSJ', '2026-05-20T17:35:00Z', 'Payments from a clearing broker on cash sweep balances were not surfaced in Form ADV, according to the order instituting proceedings.'],
    ['Fiduciary duty debate reopens over default options in group RRSPs', 'BNN Bloomberg', '2026-05-19T11:40:00Z', 'Plan sponsors question whether target-date defaults meet a prudence standard when member fee levels vary by more than 40 basis points.'],
    ['Buy-side compliance teams flag gifts and entertainment as the top 2026 risk', 'Bloomberg', '2026-05-18T15:10:00Z', 'A survey of 210 chief compliance officers put it ahead of personal trading for the first time, citing the return of in-person conferences.'],
    ['A Quebec portfolio manager surrenders registration after a trade allocation review', 'Reuters', '2026-05-17T10:05:00Z', 'Regulators found block fills were assigned to accounts after the day’s closing price was known, breaching the firm’s own fairness policy.'],
    ['Expert-network calls draw fresh material non-public information scrutiny', 'FT', '2026-05-15T12:30:00Z', 'Compliance officers are reinstating chaperones for consultations with current employees of covered issuers, reversing a decade of lighter oversight.'],
  ],

  // ── HM — Happening Marketing ──
  'strategic-marketing': [
    ['Canada Goose repositions around year-round apparel as parka mix falls to 41%', 'Financial Post', '2026-05-22T13:45:00Z', 'The brand will lead spring campaigns with rainwear and footwear, a category that grew 28% last fiscal year.'],
    ['Kantar BrandZ: Canadian brand equity gains concentrate in banking and telecom', 'Marketing Week', '2026-05-22T08:30:00Z', 'The top 10 domestic brands now account for 63% of total ranked value, the highest concentration since the index launched.'],
    ['Brands add share-of-model tracking to positioning scorecards as AI answers replace search results', 'AdAge', '2026-05-21T16:10:00Z', 'Trackers measure how often a brand is named in generative AI answer engines, with 31% of surveyed CMOs already funding the metric.'],
    ['No Name pushes upmarket with a 90-SKU premium tier', 'Retail Dive', '2026-05-21T10:05:00Z', 'The line keeps a distinct yellow-and-black system to avoid diluting the discount positioning built over four decades.'],
    ['National brands rebuild separate Quebec brand platforms as transcreation falls out of favour', 'Strategy Online', '2026-05-20T12:00:00Z', 'Montreal agencies report a 40% rise in briefs asking for original Quebec creative rather than adapted English work.'],
    ['Price-pack architecture returns as the main lever in the marketing mix', 'Marketing Dive', '2026-05-19T15:25:00Z', 'Brands are launching smaller counts at flat shelf prices, and 58% of CPG launches in Q1 used a new pack size.'],
    ['Category-entry-point research overtakes segmentation in brand-tracking budgets', 'Marketing Week', '2026-05-18T09:40:00Z', 'Mental availability metrics now appear in 44% of brand trackers, up from 19% in 2023.'],
    ['Challenger brands win share by narrowing positioning, analysis of 300 launches finds', 'HBR', '2026-05-16T11:00:00Z', 'Firms that cut their claimed benefits from four to one grew share 2.1 points faster over three years.'],
  ],
  'experiential-marketing': [
    ['Grand Prix week turns Crescent Street into 14 branded activations', 'Strategy Online', '2026-05-22T15:00:00Z', 'Montreal’s downtown business association says activation permits for the June race weekend sold out nine weeks early.'],
    ['Sponsorship spend in Canada to hit $3.1B in 2026, led by women’s sport', 'Marketing Dive', '2026-05-22T09:15:00Z', 'Rights fees for PWHL and Northern Super League properties rose 47% year over year off a small base.'],
    ['Pop-up leases get shorter: average retail activation term falls to 19 days', 'Retail Dive', '2026-05-21T13:30:00Z', 'Landlords are carving out permanent flex bays in malls, with one national operator piloting the format in four centres.'],
    ['Brands shift trade-show budgets from booth build to owned hospitality suites', 'AdWeek', '2026-05-20T17:45:00Z', 'Exhibitors report off-floor meeting space now absorbs 38% of event budgets, up from 21% in 2023.'],
    ['Real-time generative AI visuals move from novelty to standard in festival activations', 'AdAge', '2026-05-20T10:20:00Z', 'Agencies say AI-rendered attendee portraits cut per-guest content cost below $0.40 while doubling social shares.'],
    ['Festival sponsors trade logo placement for programming ownership', 'Strategy Online', '2026-05-19T12:00:00Z', 'Three Osheaga partners will curate stages in 2026 rather than buy signage, a structure organizers say lifts renewals.'],
    ['Fan-experience data becomes the ask in arena sponsorship renewals', 'Marketing Week', '2026-05-18T08:50:00Z', 'Brands are negotiating first-party data clauses covering concourse dwell time, in-app check-ins and post-event survey access.'],
    ['Experiential agencies report a measurement gap: only 29% tie activations to sales', 'Marketing Dive', '2026-05-16T14:10:00Z', 'The rest still report reach and dwell time, a gap finance teams increasingly refuse to fund.'],
  ],
  'digital-marketing': [
    ['Zero-click search pushes brand sites to publish answer-ready content blocks', 'Marketing Dive', '2026-05-22T14:40:00Z', 'Publishers report organic sessions down 18% year over year while assisted conversions from generative AI referrals climb.'],
    ['Paid search CPCs in Canada rise 12% as advertisers bid on generative AI placements', 'eMarketer', '2026-05-22T07:55:00Z', 'Financial services and insurance drove most of the increase, with average CPC crossing $6.40 in the first quarter.'],
    ['Agentic media buying takes 15% of one national retailer’s programmatic spend', 'AdWeek', '2026-05-21T16:30:00Z', 'The autonomous bidder rebalanced budgets hourly across nine DSP seats while human traders reviewed only exceptions.'],
    ['Influencer contracts add whitelisting rights by default in 2026 renewals', 'Marketing Dive', '2026-05-21T09:10:00Z', 'Paid amplification of creator posts now beats brand-handle ads by 2.3 times on cost per acquisition.'],
    ['Retail media grows on-site search ads faster than off-site display', 'Retail Dive', '2026-05-20T13:05:00Z', 'Sponsored product listings deliver a 4.8 times return, roughly double what the same networks report off-site.'],
    ['Short-form video overtakes feed static in Canadian paid social budgets', 'Strategy Online', '2026-05-19T11:25:00Z', 'Vertical video now takes 54% of paid social spend among the 40 largest domestic advertisers.'],
    ['SEO teams reorganize around entity and schema work as crawlers change', 'Marketing Week', '2026-05-18T15:00:00Z', 'Structured-data coverage rose from 34% to 71% of pages across a sample of 200 e-commerce sites.'],
    ['Connected-TV inventory floods the market, driving CPMs down 21%', 'eMarketer', '2026-05-17T10:30:00Z', 'Ad-supported streaming tiers added 38 million subscribers in twelve months, outpacing advertiser demand across every major market.'],
  ],
  'b2b-marketing': [
    ['Buying committees grow to 11 people, stretching enterprise cycles past nine months', 'HBR', '2026-05-22T12:35:00Z', 'Deals with more than eight stakeholders were 34% likelier to end in no decision than in a loss to a rival.'],
    ['B2B marketers move budget from MQL volume to pipeline-sourced targets', 'Marketing Week', '2026-05-22T08:05:00Z', 'Only 26% of surveyed teams still carry a lead-volume quota, down from 61% three years ago.'],
    ['AI agents qualify inbound demand at a mid-market SaaS vendor, freezing SDR hiring plans', 'The Information', '2026-05-21T17:20:00Z', 'The vendor routes 4,000 monthly inbounds through an agent that books meetings straight into rep calendars.'],
    ['Account-based programs narrow: median target list falls to 180 accounts', 'Forrester', '2026-05-21T10:50:00Z', 'Teams running lists under 250 accounts reported 2.6 times the meeting rate of broad-list programs.'],
    ['Channel partners demand co-branded demand-gen funds over rebates', 'CIO Dive', '2026-05-20T14:15:00Z', 'Vendors are moving 30% of partner incentive budgets into development funds tied to sourced pipeline.'],
    ['Enterprise software buyers finish 70% of evaluation before contacting sales', 'MIT Sloan Management Review', '2026-05-19T09:35:00Z', 'Analyst calls and private peer communities now outrank vendor content in shortlisting decisions, according to a 900-buyer survey.'],
    ['Canadian industrial manufacturers build their first in-house demand-gen teams', 'Canadian Manufacturing', '2026-05-18T13:20:00Z', 'Distributors that once owned the customer relationship are being bypassed by direct e-commerce portals and paid search programs.'],
    ['Dark social breaks attribution: 43% of new pipeline reports no first touch', 'Marketing Dive', '2026-05-17T08:00:00Z', 'Teams are adding self-reported attribution fields to demo forms to recover an origin that analytics platforms never capture.'],
  ],
  'international-marketing': [
    ['Canadian consumer brands accelerate EU entry as US tariff exposure grows', 'Globe and Mail', '2026-05-22T11:40:00Z', 'Export Development Canada reports a 24% rise in market-entry advisory files from food and beverage exporters.'],
    ['Global campaigns fragment as multinationals cut single-idea global briefs by a third', 'AdAge', '2026-05-22T06:50:00Z', 'Regional teams now control an average of 45% of working media, up from 28% in 2022.'],
    ['AI powered dubbing cuts localization cost per market below $9,000 for global spots', 'Marketing Week', '2026-05-21T14:00:00Z', 'Twelve-market rollouts that once took nine weeks now ship in eleven days, though legal sign-off remains the bottleneck.'],
    ['India and Indonesia absorb the largest share of new global media budgets', 'eMarketer', '2026-05-20T16:25:00Z', 'Combined ad spend across the two markets passes $32B in 2026, growing three times faster than Western Europe.'],
    ['Cross-border parcels face new de minimis thresholds in three markets', 'Reuters', '2026-05-20T09:00:00Z', 'Brands shipping direct from Asia are rebuilding landed-cost calculators ahead of a September enforcement date.'],
    ['Quebec language rules reshape how global brands file trademarks', 'Financial Post', '2026-05-19T13:45:00Z', 'Bill 96 signage requirements have pushed multinationals to register French descriptors alongside English marks in every product category.'],
    ['Luxury houses shift Middle East budgets from wholesale to owned retail marketing', 'FT', '2026-05-18T10:15:00Z', 'Riyadh and Dubai flagship openings now carry local creative budgets that rival Paris and Milan.'],
    ['Emerging-market launch plans skip television entirely', 'Marketing Dive', '2026-05-16T12:30:00Z', 'Nigeria, Vietnam and Colombia launches allocated more than 80% of spend to social and messaging apps.'],
  ],
  'hr-marketing': [
    ['Employer-brand budgets move out of HR and into marketing at large Canadian firms', 'Globe and Mail', '2026-05-22T10:25:00Z', 'Nine of the twenty largest employers surveyed now fund careers content from the CMO line, not talent acquisition.'],
    ['EVP refreshes surge as return-to-office mandates settle at three days', 'HBR', '2026-05-21T15:50:00Z', 'Firms that rewrote their value proposition around flexibility held application volume within 4% of remote-era peaks.'],
    ['Candidate experience becomes a brand risk: 58% share bad interviews publicly', 'Marketing Week', '2026-05-21T08:40:00Z', 'Half of those posts name the employer, and a third mention its consumer products by name.'],
    ['AI screening disclosures land on career sites ahead of new hiring rules', 'CIO Dive', '2026-05-20T12:55:00Z', 'Employers must state where AI tools rank applicants, with plain-language notices replacing the legal boilerplate used until now.'],
    ['Career sites rebuilt for search: 68% of large employers now mark up job pages', 'Marketing Dive', '2026-05-19T14:30:00Z', 'Organic applications rose 22% at employers that added structured data and posted salary bands on every open role.'],
    ['Quebec engineering firms market to talent in France with relocation campaigns', 'Strategy Online', '2026-05-18T11:10:00Z', 'Paid social in Lyon and Nantes drove 3,400 qualified applications over an eight-week flight costing under $200,000.'],
    ['Talent communities outperform job boards as recruitment marketing borrows retention tactics', 'Forrester', '2026-05-17T09:20:00Z', 'Nurtured candidate pools filled roles 19 days faster than open postings across a 40-employer sample.'],
    ['Frontline hiring shifts to messaging apps as application forms are abandoned', 'Retail Dive', '2026-05-15T13:00:00Z', 'A national grocery chain cut its application to four questions and saw completion climb from 31% to 74%.'],
  ],
  'request-for-agency-proposal': [
    ['Media reviews cluster in Q3 as Canadian advertisers align pitches to fiscal year', 'Strategy Online', '2026-05-22T13:10:00Z', 'Eleven accounts worth a combined $310M in billings are expected to go to market before September.'],
    ['RFPs now require AI-usage disclosure from agencies in creative development', 'AdAge', '2026-05-22T09:45:00Z', 'Standard clauses ask which AI tools touched the work, what data trained them, and who holds the output rights.'],
    ['Advertisers cut pitch lists to three agencies to shorten reviews', 'AdWeek', '2026-05-21T12:20:00Z', 'Average review length fell from 22 weeks to 14 where clients paid a stipend and dropped the chemistry round.'],
    ['Procurement returns to agency selection, weighting rate cards at 40% of scoring', 'Marketing Week', '2026-05-20T15:35:00Z', 'Creative leaders warn the shift favours scale holding companies over independents, which rarely publish comparable blended hourly rates.'],
    ['In-house team competes in a formal review at a Canadian telco', 'Marketing Dive', '2026-05-19T10:45:00Z', 'The internal group was scored against three external shops on the same brief and kept half the account.'],
    ['Agency-of-record model splits as brands appoint separate strategy and production partners', 'AdAge', '2026-05-18T14:05:00Z', 'Roughly 37% of reviews completed this year awarded scopes to two or more shops rather than a single AOR.'],
    ['Pitch stipends become standard in Canada after industry body guidance', 'Strategy Online', '2026-05-17T11:15:00Z', 'The recommended floor is $15,000 per finalist for a combined creative and media review lasting more than eight weeks.'],
    ['Media auditors gain veto power over shortlists in large account reviews', 'AdWeek', '2026-05-15T09:30:00Z', 'Auditors vet transparency terms and principal-media disclosure before agencies are invited to present, adding roughly three weeks upfront.'],
  ],
};

const REPORTS_RAW: Partial<Record<DisciplineId, ReportRow[]>> = {
  'finance': [
    ['BCG', 'The State of Capital Markets 2026', '2026-05-20', 'How private credit, infrastructure, and secondaries are reshaping the institutional allocation playbook.'],
    ['McKinsey', 'Banking on a sustainable transition: A CFO playbook', '2026-05-15', 'CFOs face a $4T capex challenge to fund the net-zero transition. A guide to financing decisions.'],
    ['Deloitte', 'Treasury 2030: The autonomous finance function', '2026-05-10', 'How agentic AI is reshaping cash, liquidity, and FX management.'],
    ['Strategy+Business', 'Why M&A is back — and what makes deals stick this cycle', '2026-05-05', 'Lessons from 40 cross-border transactions completed in 2024–25.'],
  ],
  'accounting': [
    ['Deloitte', 'IFRS 18 implementation: A preparer’s guide', '2026-05-18', 'A walk-through of the operating-profit classification and management performance measures.'],
    ['PwC', 'The audit of the future: AI in workpapers', '2026-05-12', 'Six practical use cases now in deployment across Big Four engagements.'],
    ['BCG', 'Closing faster: How best-in-class CFOs hit a 4-day close', '2026-05-08', 'Benchmarks from 80+ multinational close cycles.'],
  ],
  'tax': [
    ['PwC', 'Pillar Two: Year-two compliance lessons', '2026-05-19', 'What in-scope MNEs learned in the first reporting cycle.'],
    ['Deloitte', 'Tax transformation 2026: Building the tax data foundation', '2026-05-14', 'A maturity model for tax data and analytics teams.'],
    ['McKinsey', 'The CFO–CTO partnership for tax tech', '2026-05-07', 'Why tax tech projects fail without joint accountability.'],
  ],
  'marketing': [
    ['McKinsey', 'The CMO–CFO compact: Justifying brand investment in 2026', '2026-05-21', 'A shared measurement framework for marketing ROI.'],
    ['BCG', 'Retail media: From experiment to channel', '2026-05-16', 'Sizing the retail media opportunity and identifying winners.'],
    ['Deloitte', 'Generative AI in marketing: Field guide', '2026-05-09', 'Use cases, governance, and measurement for gen-AI in B2C marketing.'],
    ['Strategy+Business', 'Brand in the age of agents', '2026-05-03', 'How agent-mediated commerce changes brand-building.'],
  ],
  'strategy': [
    ['BCG', 'The 2026 Sustainability & Strategy Survey', '2026-05-20', 'How CEOs are integrating climate strategy into core corporate strategy.'],
    ['McKinsey', 'The future of strategy in the AI era', '2026-05-15', 'Why "strategy as continuous experimentation" is replacing five-year plans.'],
    ['Strategy+Business', 'When to break up your conglomerate', '2026-05-10', 'A decision framework for sum-of-parts assessments.'],
    ['Deloitte', 'Scenario planning under deep uncertainty', '2026-05-05', 'Updated tools for tariff, supply-chain, and geopolitical scenarios.'],
  ],
  'digital-strategy': [
    ['McKinsey', 'The state of AI 2026', '2026-05-22', 'Annual survey on enterprise AI adoption, deployment patterns, and value capture.'],
    ['BCG', 'Build vs. buy vs. agent: New choices in the AI stack', '2026-05-17', 'A decision framework for enterprise architecture in 2026.'],
    ['Deloitte', 'Tech Trends 2026', '2026-05-11', 'Six trends shaping enterprise tech investment over the next 18–24 months.'],
  ],
  'entrepreneurship': [
    ['BCG', 'The new venture playbook for AI-native startups', '2026-05-19', 'How AI-native companies are scaling differently — and what that means for VCs.'],
    ['Strategy+Business', 'Founder-led to professional-led: Surviving the transition', '2026-05-14', 'Case studies of nine successful CEO transitions.'],
    ['McKinsey', 'Venture capital 2026: A reset, not a retreat', '2026-05-08', 'How LP capital allocation is evolving.'],
  ],
  'hr': [
    ['McKinsey', 'The skills-based organization: 2026 update', '2026-05-21', 'How leading firms operationalize skills graphs across hiring, mobility, and L&D.'],
    ['Deloitte', '2026 Global Human Capital Trends', '2026-05-16', 'This year’s focus: trust, agency, and human-AI collaboration.'],
    ['BCG', 'Why return-to-office is failing', '2026-05-09', 'And what hybrid done right looks like across 12 sectors.'],
  ],
  'pom': [
    ['BCG', 'The resilient supply chain: 2026 benchmarks', '2026-05-22', 'A field-tested set of resilience metrics across 600+ supply chains.'],
    ['McKinsey', 'Nearshoring scoreboard: Where the capacity is moving', '2026-05-18', 'A view across electronics, autos, pharma, and apparel.'],
    ['Deloitte', 'Manufacturing CFO outlook 2026', '2026-05-12', 'Capex priorities, automation ROI, and labor cost pressure.'],
  ],
  'sustainability': [
    ['Deloitte', '2026 ESG Reporting Trends', '2026-05-21', 'How CSRD, ISSB, and SEC rules are converging — and where they diverge.'],
    ['McKinsey', 'The decarbonization investment thesis', '2026-05-17', 'Mapping $9T of climate capex through 2030.'],
    ['BCG', 'Net Zero 2026: The progress report', '2026-05-12', 'Where corporate decarbonization is on track, behind, or off the rails.'],
    ['Strategy+Business', 'Biodiversity is the next material risk', '2026-05-04', 'Why nature-related financial disclosures will reshape the next decade.'],
  ],
  'international': [
    ['McKinsey', 'Global flows 2026: The reconfigured world', '2026-05-21', 'How trade, capital, and data are flowing in a multipolar economy.'],
    ['BCG', 'Geopolitical scenarios for the global CEO', '2026-05-15', 'Four operating scenarios for 2026–2030.'],
    ['Deloitte', 'Tariffs and the CFO: A playbook', '2026-05-09', 'How finance teams are modeling tariff impact end-to-end.'],
  ],

  // ── SMNG — Symposium en Management ──
  'human-resource-management': [
    ['McKinsey', 'Workforce planning when headcount is flat', '2026-05-21', 'How leading employers reallocate existing roles instead of hiring, using skills adjacency rather than job families.'],
    ['Deloitte', 'The collective bargaining outlook for 2026-27', '2026-05-14', 'Wage settlement benchmarks and scheduling-language trends across 400 Canadian agreements expiring in the next 18 months.'],
    ['BCG', 'What chief people officers own now', '2026-05-07', 'The CPO mandate has widened to include workforce cost, AI adoption, and labour relations. A guide to the new scope.'],
  ],
  'change-management': [
    ['BCG', 'Change that sticks: The 2026 Transformation Survey', '2026-05-20', 'Why only 26% of large transformations hold their gains past year three, and the four practices that separate them.'],
    ['Strategy+Business', 'Reorganizing without the reorg', '2026-05-13', 'Structural change is the expensive option. Six lower-cost levers that move behaviour first.'],
    ['Deloitte', 'Culture change in merged organizations', '2026-05-06', 'A 100-day playbook for integrating two operating cultures without gutting either one.'],
  ],
  'digital-transformation': [
    ['Deloitte', 'Core system replacement: A sequencing guide', '2026-05-19', 'How to phase a multi-year platform migration when the legacy system still runs the business every night.'],
    ['McKinsey', 'Getting value from ERP: Lessons from 120 programs', '2026-05-12', 'Programs that froze scope before build came in 31% closer to budget than those that did not.'],
    ['PwC', 'The 2026 Cloud Migration Benchmark', '2026-05-05', 'Cost, timeline, and rollback data from 240 enterprise migrations completed since 2023.'],
  ],
  'project-management': [
    ['McKinsey', 'Why megaprojects still overrun, and the five fixes that work', '2026-05-18', 'Front-end loading and owner-side engineering capacity explain most of the variance across 300 capital projects.'],
    ['BCG', 'Capital project delivery in a high-cost environment', '2026-05-11', 'How owners are resequencing portfolios when construction inflation outpaces the approved business case.'],
    ['PwC', 'The 2026 Capital Programs Survey', '2026-05-04', 'Governance, contracting model, and contingency benchmarks from 180 owners across energy, transport, and health.'],
  ],
  'mergers-acquisitions': [
    ['PwC', 'Global M&A Industry Trends: 2026 Mid-Year Outlook', '2026-05-22', 'Deal volume, sector rotation, and the financing conditions shaping the second half.'],
    ['BCG', 'The 2026 M&A Report: Buying in a higher-rate world', '2026-05-15', 'Value creation is shifting from multiple expansion to operating improvement. What that changes at the deal model stage.'],
    ['Deloitte', 'Due diligence beyond the numbers', '2026-05-08', 'Adding talent, technology debt, and supplier concentration to a diligence scope that most buyers still run on financials alone.'],
  ],
  'management-of-smes': [
    ['Deloitte', 'The 2026 Family Business Survey', '2026-05-17', 'Succession readiness, governance structures, and next-generation intentions across 1,900 family-owned firms.'],
    ['McKinsey', 'Small business, big constraint: Financing the mid-market gap', '2026-05-10', 'Why firms between $5M and $50M in revenue face the widest credit gap, and what closes it.'],
    ['Strategy+Business', 'Owner-operators and the succession cliff', '2026-05-03', 'Three transfer structures compared, with the tax and continuity trade-offs of each.'],
  ],
  'market-targeting': [
    ['BCG', 'Segmentation after the cookie: A first-party playbook', '2026-05-21', 'Rebuilding customer segments from loyalty, transaction, and consented survey data.'],
    ['McKinsey', 'The 2026 Consumer Segment Atlas', '2026-05-16', 'Nine North American consumer segments sized by spend, growth, and channel preference.'],
    ['PwC', 'Positioning for the value-seeking consumer', '2026-05-09', 'How premium brands defend price without conceding the mid-market to private label.'],
  ],

  // ── FO — Omnium Financier ──
  'personal-finance': [
    ['Deloitte', 'The renewal cliff: Canadian household balance sheets in 2026', '2026-05-21', 'Modelling payment shock across 1.6 million mortgages that reset between 2026 and 2028.'],
    ['McKinsey', 'Advice for the mass affluent: Serving the $250K household', '2026-05-14', 'Why conventional wealth models leave two-thirds of Canadian savers underserved.'],
    ['PwC', 'Retirement readiness index 2026', '2026-05-07', 'A survey of 6,000 workers finds a median replacement-rate gap of 18 percentage points.'],
  ],
  'corporate-finance': [
    ['BCG', 'Capital allocation in a higher-for-longer world', '2026-05-20', 'How 120 large caps reset hurdle rates, payout policy, and capex after three years of elevated funding costs.'],
    ['PwC', 'Refinancing the 2027 maturity wall', '2026-05-13', 'Sizing $1.9T of corporate debt coming due and the bank, bond, and private-credit options for each tier.'],
    ['McKinsey', 'The leverage playbook for mid-market issuers', '2026-05-06', 'Covenant design, ratings headroom, and when to trade flexibility for a lower coupon.'],
  ],
  'financial-markets': [
    ['McKinsey', 'Global markets outlook: The passive tipping point', '2026-05-22', 'What index ownership above 40% means for price discovery, liquidity, and corporate governance.'],
    ['Deloitte', 'Volatility regimes and the cost of hedging equity risk', '2026-05-15', 'Backtests across four regimes showing when protection is worth its premium.'],
    ['BCG', 'Where the next dollar of index flow goes', '2026-05-08', 'Mapping benchmark construction rules to the flows they mechanically create.'],
  ],
  'taxation': [
    ['PwC', 'Tax compliance operating models 2026', '2026-05-19', 'In-house, co-source, or outsource: benchmarks from 90 multinational tax functions.'],
    ['Deloitte', 'Surviving the audit: A transfer pricing documentation guide', '2026-05-12', 'Building a defence file that holds up under a 90-day production demand.'],
    ['BCG', 'Automating the indirect tax close', '2026-05-05', 'Where GST, HST, and VAT determination engines actually reduce cycle time.'],
  ],
  'financial-accounting': [
    ['Deloitte', 'IFRS 18 and the new income statement subtotals', '2026-05-21', 'Worked examples of the operating, investing, and financing split for six industry profiles.'],
    ['PwC', 'Revenue recognition for consumption-based contracts', '2026-05-14', 'Applying the variable consideration constraint when usage drives most of the transaction price.'],
    ['McKinsey', 'What investors actually read in the annual report', '2026-05-06', 'Eye-tracking and interview evidence from 40 institutional analysts on disclosure that changes a model.'],
  ],
  'management-accounting': [
    ['BCG', 'From annual budget to rolling forecast', '2026-05-20', 'A staged migration path, including the driver library and the governance that keeps it honest.'],
    ['Deloitte', 'Cost-to-serve: Getting allocation right', '2026-05-13', 'Choosing drivers business units will accept, with benchmarks from distribution and industrial clients.'],
    ['Strategy+Business', 'Unit economics as a management system', '2026-05-04', 'How subscription businesses move contribution margin from a board slide into weekly operating decisions.'],
  ],
  'stock-market-simulation': [
    ['McKinsey', 'Asset allocation after the 60/40', '2026-05-21', 'Liquidity budgeting and rebalancing rules for portfolios holding a fifth in private assets.'],
    ['BCG', 'The derivatives desk in 2030', '2026-05-12', 'How clearing, margin, and retail options demand are reshaping bank and buy-side trading operations.'],
    ['Deloitte', 'Execution quality and the cost of trading', '2026-05-05', 'Measuring implementation shortfall consistently across venues, brokers, and algorithmic strategies.'],
  ],
  'cfa-ethics-challenge': [
    ['PwC', 'Conflicts of interest in integrated wealth platforms', '2026-05-19', 'Where proprietary product, cash sweep, and referral economics collide with a client-first standard.'],
    ['Deloitte', 'Conduct risk in the age of algorithmic advice', '2026-05-11', 'Supervision, disclosure, and record-keeping when a model recommends and a human signs off.'],
    ['Strategy+Business', 'Building a culture that survives the incentive plan', '2026-05-04', 'Nine case studies on aligning compensation with the conduct standards a firm claims to hold.'],
  ],

  // ── HM — Happening Marketing ──
  'strategic-marketing': [
    ['BCG', 'Positioning under pressure: Rebuilding equity after three years of price-led growth', '2026-05-21', 'Benchmarks from 90 consumer brands that traded promotion depth for pricing power.'],
    ['McKinsey', 'The growth portfolio: When to prune a sub-brand', '2026-05-14', 'A decision framework for consolidating consumer portfolios without losing shelf presence.'],
    ['Strategy+Business', 'Category entry points and the limits of segmentation', '2026-05-06', 'Why mental availability is displacing persona work in annual brand planning.'],
  ],
  'experiential-marketing': [
    ['Deloitte', 'The experience dividend: Measuring live brand activations', '2026-05-20', 'A tested attribution approach linking on-site engagement to twelve-week purchase behaviour.'],
    ['BCG', 'Sponsorship portfolios in the era of women’s sport', '2026-05-13', 'Rights valuation models for properties with fast audience growth and thin historical data.'],
    ['PwC', 'Trade shows reconsidered: Where the B2B event budget should go', '2026-05-04', 'Cost-per-qualified-conversation benchmarks across 15 industry event categories.'],
  ],
  'digital-marketing': [
    ['McKinsey', 'Performance marketing after the search box', '2026-05-22', 'How generative answer engines change keyword strategy, measurement, and budget mix.'],
    ['Deloitte', 'The creator economy as a managed media channel', '2026-05-12', 'Governance, rights, and pricing models for always-on influencer programs.'],
    ['BCG', 'Programmatic supply paths: A 2026 audit guide', '2026-05-05', 'What advertisers recovered by cutting reseller hops and consolidating DSP seats.'],
  ],
  'b2b-marketing': [
    ['PwC', 'Selling to the eleven-person committee', '2026-05-19', 'Content and enablement patterns that build consensus rather than single champions.'],
    ['McKinsey', 'From leads to pipeline: Rebuilding B2B marketing metrics', '2026-05-11', 'A measurement model that survives the removal of the MQL.'],
    ['BCG', 'Channel partner economics in enterprise software', '2026-05-02', 'How incentive design moves partners toward sourced, not merely influenced, revenue.'],
  ],
  'international-marketing': [
    ['Deloitte', 'Market entry playbook 2026: Canada to Europe', '2026-05-21', 'Regulatory, retail and media considerations for mid-size consumer exporters.'],
    ['BCG', 'Global brand, local budget: Rebalancing the centre and the regions', '2026-05-13', 'Evidence on where centralized creative still pays and where it stops working.'],
    ['Strategy+Business', 'The next billion consumers: Marketing in mobile-first economies', '2026-05-06', 'Channel mix, pricing and packaging lessons drawn from eight emerging markets.'],
  ],
  'hr-marketing': [
    ['Deloitte', 'The employer brand balance sheet', '2026-05-20', 'A model linking careers-content investment to cost per hire and twelve-month retention.'],
    ['McKinsey', 'Employee value propositions that survive contact with reality', '2026-05-12', 'Why promise-to-experience gaps drive most first-year attrition.'],
    ['PwC', 'Candidate experience as consumer experience', '2026-05-04', 'Field research on how rejected applicants behave as customers afterward.'],
  ],
  'request-for-agency-proposal': [
    ['PwC', 'Running an agency review that does not exhaust everyone', '2026-05-18', 'A stage-gated process design with stipends, scoring weights, and realistic timelines.'],
    ['BCG', 'Agency remuneration models compared', '2026-05-10', 'Fee, commission, output and outcome-based structures across 60 client engagements.'],
    ['Deloitte', 'In-house or agency: A total-cost view of the marketing operating model', '2026-05-03', 'Where internal teams beat external shops, and the volume thresholds that flip the answer.'],
  ],
};

/* AI relevance is DERIVED, not hand-listed (brief §3f). An earlier version of
   this file carried a hardcoded set of keys; four of the six were not actually
   about AI and it missed several that were. Running the real matcher over the
   seed data instead means the fixtures demonstrate the same rule ingest will
   apply in Sprint 2, and they cannot drift away from it.

   Currently 7 of 92 seed articles match — enough to exercise the badge and the
   filter, including disciplines where an AI angle is genuinely absent. */

/* The URL is synthesised from the discipline and row index exactly as the
   prototype did. It has to stay that way: id = h(url), so changing the URL
   shape changes every fixture id and breaks the stability check in
   format.test.ts along with any bookmark saved against the old ids. */
function buildArticles(): Record<string, FeedItem[]> {
  const out: Record<string, FeedItem[]> = {};
  for (const d of DISCIPLINES) {
    out[d.id] = (ARTICLES_RAW[d.id] ?? []).map((row, i) => {
      const [title, source, publishedAt, description] = row;
      const url = `https://news.example.com/${d.id}/${i + 1}`;
      return {
        id: h(url),
        title, source, publishedAt, description, url,
        discipline: d.label,
        disciplineId: d.id,
        type: 'article' as const,
        aiRelevant: isAiRelevant(title, description),
        sponsorId: null,
      };
    });
  }
  return out;
}

function buildReports(): Record<string, FeedItem[]> {
  const out: Record<string, FeedItem[]> = {};
  for (const d of DISCIPLINES) {
    out[d.id] = (REPORTS_RAW[d.id] ?? []).map((row, i) => {
      const [source, title, publishedAt, description] = row;
      const url = `https://${source.toLowerCase().replace(/[^a-z]/g, '')}.example.com/${d.id}/${i + 1}`;
      return {
        id: h(url),
        title, source, publishedAt, description, url,
        discipline: d.label,
        disciplineId: d.id,
        type: 'report' as const,
        aiRelevant: isAiRelevant(title, description),
        sponsorId: null,
      };
    });
  }
  return out;
}

export const ARTICLES = buildArticles();
export const REPORTS = buildReports();
