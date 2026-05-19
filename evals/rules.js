/* ─────────────────────────────────────────
   rules.js — deterministic rule checks
   Each rule takes a tutor response (string)
   and a case (the golden entry) and returns
   { pass, detail }.
   ───────────────────────────────────────── */
'use strict';

// Words Pip must NEVER use, per lesson-design.md voice rules.
// We check word-boundary matches to avoid false positives ("note", "knot").
const BANNED_WORDS = [
  'wrong',
  'incorrect',
  'not right',
  "isn't right",
  'nope',
  // 'no' on its own is too noisy — many legit constructions ("no bigger pieces").
  // We catch it via the regex below only when it stands alone with sentence-ending punctuation.
];

const BANNED_PATTERNS = [
  /\bwrong\b/i,
  /\bincorrect\b/i,
  /\bnot right\b/i,
  /\bisn't right\b/i,
  /\bnope\b/i,
  // Standalone "no" used as a negation in isolation: "No.", "No!", "No,"
  /^no[.,!?\s]/i,
  /[.,!?\s]no[.,!?]/i,
];

// Words that signal Pip is referencing the manipulative the kid just used.
// At least one should appear. The lesson is fruit-themed (apple → pizza →
// banana → orange) so the manipulative vocabulary spans physical fruit
// actions (slice, squish, peel) and fraction-piece vocabulary (half, quarter).
const MANIPULATIVE_REFS = [
  // legacy block-era vocab kept for back-compat with any responses that drift
  'split', 'smash', 'smashed', 'smashing',
  'piece', 'pieces',
  'fit', 'fits', 'fitting',
  'snap', 'snapped', 'snapping',
  'bar',

  // fraction-piece vocabulary
  'half', 'halves', 'halved',
  'quarter', 'quarters',
  'fourth', 'fourths',
  'third', 'thirds',
  'sixth', 'sixths',
  'eighth', 'eighths',
  'segment', 'segments',
  'slice', 'slices', 'sliced', 'slicing',
  'chunk', 'chunks',
  'wedge', 'wedges',

  // fruit-action vocabulary (what the kid does in the lesson)
  'cut', 'cuts', 'cutting',
  'squish', 'squished', 'squishing',
  'mash', 'mashed',
  'peel', 'peeled', 'peeling',
  'cover', 'covers', 'covered', 'covering',

  // the fruits themselves
  'apple', 'apples',
  'pizza', 'pizzas',
  'banana', 'bananas',
  'orange', 'oranges',
  'fruit', 'fruits',
];

// ── Rule implementations ──────────────────────────────────────

function noBannedWords(text) {
  const hits = BANNED_PATTERNS
    .map((re) => re.exec(text))
    .filter(Boolean)
    .map((m) => m[0].trim());
  return {
    pass: hits.length === 0,
    detail: hits.length ? `banned phrasing: ${[...new Set(hits)].join(', ')}` : '',
  };
}

function underLength(text, max = 200) {
  const len = text.trim().length;
  return {
    pass: len > 0 && len <= max,
    detail: len === 0 ? 'empty response' : (len > max ? `${len} chars (max ${max})` : ''),
  };
}

function notTooShort(text, min = 10) {
  const len = text.trim().length;
  return {
    pass: len >= min,
    detail: len < min ? `${len} chars (min ${min})` : '',
  };
}

function asksQuestion(text) {
  // Pip's voice rules: more questions than statements. We require at least one ?.
  // Skipped for rephrase mode — see runRules() below.
  return {
    pass: text.includes('?'),
    detail: text.includes('?') ? '' : 'no question mark — Pip should ask, not lecture',
  };
}

function referencesManipulative(text) {
  const lower = text.toLowerCase();
  const hit = MANIPULATIVE_REFS.find((w) => new RegExp(`\\b${escapeRegex(w)}\\b`, 'i').test(lower));
  return {
    pass: Boolean(hit),
    detail: hit ? '' : 'no reference to pieces / split / smash / fit / bar / cut',
  };
}

function maxOneEmoji(text) {
  // Match most common emoji ranges (rough but good enough for our purposes).
  const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;
  const count = (text.match(emojiRegex) || []).length;
  return {
    pass: count <= 1,
    detail: count > 1 ? `${count} emojis (max 1)` : '',
  };
}

function notRepeatingPrompt(text, prompt) {
  // For rephrase mode we WANT the same idea in different words. So we check the
  // response shares < 60% of distinctive tokens with the original prompt.
  const stop = new Set(['the', 'a', 'an', 'is', 'are', 'do', 'you', 'i', 'it', 'of', 'to', 'in', 'on', 'and', 'or', 'so', 'if', 'that', 'what', 'how']);
  const tok = (s) =>
    s.toLowerCase()
      .replace(/[^a-z0-9\/\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stop.has(w));
  const promptTokens = new Set(tok(prompt));
  if (promptTokens.size === 0) return { pass: true, detail: '' };
  const respTokens = tok(text);
  const overlap = respTokens.filter((t) => promptTokens.has(t)).length;
  const ratio = overlap / Math.max(promptTokens.size, 1);
  return {
    pass: ratio < 0.6,
    detail: ratio >= 0.6 ? `${Math.round(ratio * 100)}% token overlap with the original question` : '',
  };
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ── Runner ────────────────────────────────────────────────────

/**
 * Apply all relevant rules to a tutor response for a given golden case.
 * Returns: { results: [{name, pass, detail}], passed, failed, total }
 */
function runRules(text, golden) {
  const isRephrase = golden.input?.mode === 'rephrase';

  const rules = [
    { name: 'noBannedWords',        fn: () => noBannedWords(text) },
    { name: 'underLength',          fn: () => underLength(text, 220) },
    { name: 'notTooShort',          fn: () => notTooShort(text, 10) },
    { name: 'maxOneEmoji',          fn: () => maxOneEmoji(text) },
  ];

  if (isRephrase) {
    // Rephrase mode: must ask a question (it IS a question), but also must
    // not be a verbatim restatement of the prompt.
    rules.push({ name: 'asksQuestion',         fn: () => asksQuestion(text) });
    rules.push({ name: 'notRepeatingPrompt',   fn: () => notRepeatingPrompt(text, golden.input.prompt) });
  } else {
    // Hint mode: must reference the manipulative AND ask a question.
    rules.push({ name: 'referencesManipulative', fn: () => referencesManipulative(text) });
    rules.push({ name: 'asksQuestion',           fn: () => asksQuestion(text) });
  }

  const results = rules.map(({ name, fn }) => {
    const r = fn();
    return { name, pass: r.pass, detail: r.detail || '' };
  });

  const passed = results.filter((r) => r.pass).length;
  return {
    results,
    passed,
    failed: results.length - passed,
    total: results.length,
  };
}

module.exports = {
  runRules,
  // Exported for unit testing if you ever want it:
  _internals: {
    noBannedWords,
    underLength,
    notTooShort,
    asksQuestion,
    referencesManipulative,
    maxOneEmoji,
    notRepeatingPrompt,
  },
};
