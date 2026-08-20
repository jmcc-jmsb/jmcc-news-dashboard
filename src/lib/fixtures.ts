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
