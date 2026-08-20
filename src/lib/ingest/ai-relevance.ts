// ABOUTME: Decides whether an article has an AI angle, by matching a phrase list against title + description.
// ABOUTME: Used at ingest to set ai_relevant, and by fixtures.ts so seed flags are derived rather than guessed.

/**
 * Most competition cases this cycle are expected to have an AI angle regardless
 * of discipline, so delegates need to surface those within any feed (brief §3f).
 *
 * **Phrases, never a bare "AI" token.** That is the whole design constraint. On
 * its own, "ai" appears inside ordinary words and matches unrelated acronyms —
 * the fixture set alone contains "Canadian Tire", "retail", and "Air Canada".
 * Every entry below therefore carries a second qualifying word.
 *
 * Extending this list is the intended way to tune recall. It is data, not
 * logic: add a phrase, run the tests, done. Nothing else needs to change.
 */
export const AI_PHRASES: readonly string[] = [
  // The technology, named directly
  'artificial intelligence',
  'generative ai',
  'gen ai',
  'machine learning',
  'large language model',
  'foundation model',
  'llm',
  'chatgpt',
  'copilot',
  'agentic',

  // "AI" qualified by what it is doing — the common headline forms
  'ai adoption',
  'ai agent',
  'ai agents',
  'ai commerce',
  'ai personalization',
  'ai powered',
  'ai native',
  'ai first',
  'ai driven',
  'ai enabled',
  'ai strategy',
  'ai tool',
  'ai tools',
  'ai rollout',
  'ai rollback',
  'ai spending',
  'ai investment',
  'ai adoption curve',
  'ai transformation',
  'ai adoption rate',
  'ai audit',
  'ai adoption gap',
  'ai capex',
  'ai talent',
  'ai governance',
  'ai regulation',
  'ai disclosure',

  /* Named AI labs and products. Only tokens with no ordinary-English or
     finance meaning are listed. Deliberately excluded, and worth remembering
     why before someone adds them back:
       - "gemini"  — also a crypto exchange, in a feed that has a finance tab
       - "cohere"  — an ordinary verb ("the strategy doesn't cohere")
       - "claude"  — a common given name
       - "nvidia"  — appears in plenty of non-AI supply-chain coverage
       - "agent"   — travel agents, insurance agents, transfer agents */
  'openai',
  'anthropic',
  'deepmind',
];

/* Hyphens and unicode dashes collapse to spaces so "AI-powered",
   "AI‑powered" and "AI powered" are one case rather than three list entries.
   Everything else is left alone — this is a matcher, not a tokenizer. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‐-―−-]/g, ' ')
    .replace(/\s+/g, ' ');
}

const PHRASE_RE = new RegExp(
  '\\b(' + AI_PHRASES.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\\b',
  'i',
);

/** True when the article has an AI angle worth badging. Title and description
 *  only — the body is never stored (brief §10, Copyright). */
export function isAiRelevant(title: string, description = ''): boolean {
  return PHRASE_RE.test(normalize(`${title} ${description}`));
}

/** The phrase that matched, for spot-checking a flag by hand. */
export function aiMatch(title: string, description = ''): string | null {
  return PHRASE_RE.exec(normalize(`${title} ${description}`))?.[1] ?? null;
}
