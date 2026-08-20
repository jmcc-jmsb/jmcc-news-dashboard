// ABOUTME: Pins the AI-relevance matcher, above all its refusal to fire on a bare "AI" token.
// ABOUTME: Run with `npm test`. These flags become a database column at ingest, so wrong is expensive.

import { test } from 'vitest';
import assert from 'node:assert/strict';
import { isAiRelevant, aiMatch, AI_PHRASES } from './ai-relevance';

test('matches the phrase forms that actually appear in headlines', () => {
  const yes: [string, string][] = [
    ['Deloitte rolls out generative-AI audit workpaper tool', ''],
    ['Shopify reorganizes around AI commerce as merchants adopt agents', ''],
    ['Stripe Atlas adds AI-first incorporation flow', ''],
    ['Canadian Tire opens AI-powered DC in Calgary', ''],
    ['Y Combinator W26 batch hits record 240 startups, 88% AI-native', ''],
    ['McKinsey on knowledge work', 'Artificial intelligence is reshaping 60% of roles.'],
    ['Treasury 2030', 'How agentic AI is reshaping cash, liquidity, and FX management.'],
    ['A quiet quarter', 'Executives cite machine learning budgets as the swing factor.'],
    ['Bank pilots assistant', 'The rollout leans on a large language model behind the scenes.'],
    ['Anthropic launches enterprise agent platform for $250B market', ''],
    ['OpenAI launches business search, undercutting Glean', ''],
  ];
  for (const [title, desc] of yes) {
    assert.ok(isAiRelevant(title, desc), `should match: ${title} ${desc}`);
  }
});

/* This is the reason the matcher exists in this shape. Brief §3f: match
   multi-word phrases, "not a bare 'AI' token, which false-positives against
   unrelated acronyms". Each of these contains the letters a-i and must NOT
   flag — several are real headlines from the seed data. */
test('never fires on a bare AI token or on words containing "ai"', () => {
  const no: [string, string][] = [
    ['Air Canada reports record load factors', ''],
    ['Retail sales contracted 0.3% MoM', ''],
    ['Canadian seed valuations rebound to 2021 levels', ''],
    ['Why platform companies are buying their suppliers back', ''],
    ['Apollo closes $25B private credit fund, largest of 2026', ''],
    ['Chairs and tables: the supply chain of office furniture', ''],
    ['AIG posts a strong quarter', ''],
    ['The Aid budget under review', ''],
    ['Maintenance capex is rising', ''],
    ['A bailout for the airline sector', ''],
    // Excluded lab/product names, each for a stated reason in ai-relevance.ts.
    ['Gemini exchange fined over custody disclosures', ''],
    ['The turnaround plan does not cohere', ''],
    ['Claude Fontaine named CFO of the year', ''],
    ['Nvidia supply constraints ease for gaming GPUs', ''],
    ['Transfer agent fees under scrutiny', ''],
  ];
  for (const [title, desc] of no) {
    assert.equal(isAiRelevant(title, desc), false, `should NOT match: ${title}`);
  }
});

test('hyphen forms collapse to the same phrase', () => {
  // Plain, ASCII hyphen, and a unicode non-breaking hyphen must behave alike.
  assert.equal(aiMatch('AI powered logistics'), 'ai powered');
  assert.equal(aiMatch('AI-powered logistics'), 'ai powered');
  assert.equal(aiMatch('AI‑powered logistics'), 'ai powered');
});

test('matching is case-insensitive and reports which phrase hit', () => {
  assert.equal(aiMatch('GENERATIVE AI IN AUDIT'), 'generative ai');
  assert.equal(aiMatch('Generative ai in audit'), 'generative ai');
  assert.equal(aiMatch('Nothing to see here'), null);
});

test('an empty or missing description is safe', () => {
  assert.equal(isAiRelevant('', ''), false);
  assert.equal(isAiRelevant('Generative AI in audit'), true);
});

test('every phrase in the list is multi-word or an unambiguous single token', () => {
  const allowedSingles = new Set(['llm', 'chatgpt', 'copilot', 'agentic', 'openai', 'anthropic', 'deepmind']);
  for (const p of AI_PHRASES) {
    const words = p.split(' ');
    assert.ok(
      words.length > 1 || allowedSingles.has(p),
      `"${p}" is a single ambiguous token — §3f requires qualifying phrases`,
    );
    assert.notEqual(p, 'ai', 'a bare "ai" phrase would defeat the whole design');
  }
});
