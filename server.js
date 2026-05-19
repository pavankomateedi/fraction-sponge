require('dotenv').config();

const express = require('express');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '32kb' }));
app.use(express.static(path.join(__dirname, 'public')));

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const PIP_SYSTEM_PROMPT = `You are Pip, a warm and curious math tutor (a friendly apple seed) for a 9-year-old. The app has THREE fruit-themed lessons; you give wrong-answer hints for all of them.

LESSON 1 — Equivalence (1/2 = 2/4). The student sliced a half-apple into two quarters and squished them back. Then a multi-fruit check:
  q1 apple: which is bigger, 1/2 or 2/4? (same size)
  q2 apple: how many quarter-pieces fit in one half? (2)
  q3 watermelon (6 wedges): is 3/6 the same as 1/2? (yes)
  q4 watermelon: how many sixth-wedges in half a watermelon? (3)
  q5 banana: is 1/3 the same as 2/6? (yes)
  q6 apple vs banana: is 1/2 the same size as 1/3? (no, different)
  q7 orange (8 segments): is 4/8 the same as 1/2? (yes)

LESSON 2 — Comparing (more pieces = smaller). The student saw a half-apple next to a smaller quarter. Check:
  c1: bigger, 1/2 or 1/4? (1/2)
  c2: bigger, 1/3 or 1/6? (1/3)
  c3: bigger, 1/2 or 1/3? (1/2)
  c4: cutting into MORE pieces makes each piece...? (smaller)
  c5: biggest single piece — 1/2, 1/4, or 1/8? (1/2)

LESSON 3 — Adding same-denominator fractions (add tops, keep bottom). The student combined two quarter-pieces into 2/4. Check:
  a1: 1/4 + 1/4? (2/4)
  a2: 1/3 + 1/3? (2/3)
  a3: 2/6 + 1/6? (3/6)
  a4: 1/5 + 2/5? (3/5)
  a5: adding same-bottom fractions, what stays the same? (the bottom number)

Use the qId you're given to know which lesson + question the student is on.

Your voice rules — never break these:
- Short sentences. Maximum two short lines.
- Never use the words "wrong," "incorrect," "no," or "not right."
- When the student answers incorrectly, redirect by referencing what they did with the FRUIT — slicing, squishing, peeling, segments, slices, halves, quarters, the specific fruit at hand.
- Use "Hmm…", "I wonder…", "Did you see that?!" Be curious WITH the kid, not above them.
- One emoji max per message. Used sparingly.
- Never lecture. Ask a question that points them back to the evidence (the fruit they just imagined or sliced).

You will be given the stage, the student's answer, and the attempt number.
Return ONLY the tutor's next message — no preamble, no quotes, no JSON. Plain text, under 25 words.`;

// Scripted fallback hints — keyed by question id. Used when:
//   - No API key is configured, or
//   - The Claude API call fails (timeout, rate limit, network).
// hints[attemptNumber - 1], clamped to the last entry.
const FALLBACK = {
  q1: {
    hints: [
      'Hmm — when you squished the two apple quarters together, did they fit perfectly into the half? What does that tell you? 🤔',
      "Look at the bar at the top. The red half and the two quarters cover the same space, right? So they're the…?",
    ],
    rephrase: 'Stare at the fruit again. Are 1/2 and 2/4 actually the same amount, or different? 🤔',
  },
  q2: {
    hints: [
      'Picture the squish you just did. Two apple pieces snapped back into one half — how many is that?',
      'One half of the apple = two quarters. So how many quarters fit inside that half? Count them 🧠',
    ],
    rephrase: 'Try again — how many quarter pieces of apple stack up to one half?',
  },
  q3: {
    hints: [
      'Picture half a watermelon. If the whole thing has 6 wedges, how many cover the half? 🤔',
      'Same idea as the apple — different fruit, different cut, same half. Half of 6 wedges is…?',
    ],
    rephrase: 'Different fruit this time — if a watermelon has 6 wedges and you grab 3, how much is that?',
  },
  q4: {
    hints: [
      'If 1/2 of the watermelon = 3/6, then how many sixth-wedges are in that half? Peek at the fraction 👀',
      'Half of 6 watermelon wedges is… how many wedges?',
    ],
    rephrase: "Picture cutting the watermelon into 6 even wedges. Count just the half — what's that number?",
  },
  q5: {
    hints: [
      'Same trick! If two apple quarters = one half, would two banana sixths = one banana third?',
      'Cut each third of the banana in two — what would each tiny piece be called?',
    ],
    rephrase: 'Different fruit this time — does 1/3 of a banana equal 2/6?',
  },
  q6: {
    hints: [
      'Hmm — if you slice a fruit into 2 pieces vs 3 pieces, are the pieces the same size? 🤔',
      'More slices means smaller slices. So a slice out of 3 is smaller than a slice out of 2.',
    ],
    rephrase: 'Compare the slice sizes: is one piece out of 2 the same as one piece out of 3?',
  },
  q7: {
    hints: [
      'If you peel an orange and have 8 segments, how many cover half of it? 🤔',
      'Half of 8 is… 4. So 4 segments out of 8 = 1/2 the orange!',
    ],
    rephrase: 'Four segments out of eight — does that equal one piece out of two?',
  },

  // ── Lesson 2: Comparing ──
  c1: {
    hints: [
      'Remember the apple — the half was a big chunk, the quarter was small. Which wins? 🤔',
      'More cuts means smaller pieces. 1/2 is two cuts, 1/4 is four cuts.',
    ],
    rephrase: 'Picture both pieces side by side. Which is the bigger chunk of apple?',
  },
  c2: {
    hints: [
      'Would you rather share a banana with 2 friends or 5 friends? Fewer friends = bigger pieces 🤔',
      'Cutting into 6 makes smaller pieces than cutting into 3.',
    ],
    rephrase: 'Bigger bottom number means smaller pieces. So which is bigger — 1/3 or 1/6?',
  },
  c3: {
    hints: [
      'Cut a fruit into 2 vs into 3 — which makes the chunkier piece? 🤔',
      '2 is fewer cuts than 3, so that piece is bigger.',
    ],
    rephrase: 'Fewer cuts = bigger pieces. Is 1/2 bigger than 1/3?',
  },
  c4: {
    hints: [
      'Think of sharing one fruit with more and more people — does your slice grow or shrink? 🤔',
      'The same fruit split into more parts means each part is tinier.',
    ],
    rephrase: 'If you keep cutting into more pieces, what happens to each piece?',
  },
  c5: {
    hints: [
      'Smallest bottom number = fewest cuts = biggest piece. Which has the smallest bottom? 🤔',
      '2 cuts vs 4 vs 8 — fewest cuts wins.',
    ],
    rephrase: 'Of 1/2, 1/4, 1/8 — which has the fewest cuts, so the biggest piece?',
  },

  // ── Lesson 3: Adding ──
  a1: {
    hints: [
      'You squished two quarter-pieces together — how many quarters is that now? 🤔',
      'Add the tops: 1 + 1 = 2. Keep the bottom: 4.',
    ],
    rephrase: 'One quarter plus one more quarter — how many quarters total?',
  },
  a2: {
    hints: [
      'Same rule — add the top numbers, keep the bottom the same 🤔',
      '1 third + 1 third. Tops: 1 + 1. Bottom stays 3.',
    ],
    rephrase: 'One third plus one third — keep the 3 on the bottom. What is it?',
  },
  a3: {
    hints: [
      'Add ONLY the tops: 2 + 1. Does the bottom number (6) change? 🤔',
      'Two sixths plus one sixth — how many sixths is that?',
    ],
    rephrase: '2 sixths and 1 more sixth — how many sixths?',
  },
  a4: {
    hints: [
      'Tops: 1 + 2. Bottom: stays 5. What do you get? 🤔',
      'One fifth plus two fifths = three fifths.',
    ],
    rephrase: 'One fifth plus two fifths — keep the 5 on the bottom. How many fifths?',
  },
  a5: {
    hints: [
      'In every example you added the tops — but did the bottom number ever change? 🤔',
      '1/4 + 1/4 = 2/4. The 4 stayed put.',
    ],
    rephrase: 'Tops get added. So which number stays the same — top or bottom?',
  },
};

function fallbackHint(qId, attemptNumber) {
  const entry = FALLBACK[qId];
  if (!entry || !entry.hints?.length) {
    return "Hmm — let's look at the fruit again. What did you see when you sliced it? 🤔";
  }
  const idx = Math.min(Math.max(0, attemptNumber - 1), entry.hints.length - 1);
  return entry.hints[idx];
}

function fallbackRephrase(qId) {
  return FALLBACK[qId]?.rephrase || 'Take another look at the fruit. What do you notice? 🤔';
}

/**
 * POST /api/tutor
 *
 * Body: { qId, prompt, studentAnswer, attemptNumber, mode }
 *   qId            — question id ('q1'..'q7')
 *   prompt         — the exact question text the student just saw
 *   studentAnswer  — the option label they picked
 *   attemptNumber  — 1-indexed; increments on each wrong answer
 *   mode           — 'hint' (default) | 'rephrase'
 *
 * Response: { message, source }
 *   source = 'claude' | 'fallback'
 */
app.post('/api/tutor', async (req, res) => {
  const {
    qId,
    prompt = '',
    studentAnswer = '',
    attemptNumber = 1,
    mode = 'hint',
  } = req.body || {};

  if (!qId) {
    return res.status(400).json({ error: 'qId is required' });
  }

  const fallback = mode === 'rephrase' ? fallbackRephrase(qId) : fallbackHint(qId, attemptNumber);

  if (!anthropic) {
    return res.json({ message: fallback, source: 'fallback' });
  }

  const userMessage =
    mode === 'rephrase'
      ? `The student is on question: "${prompt}". They got it wrong on attempt ${attemptNumber}. Re-ask the same question in different, gentler words. Stay short and warm. Do NOT give them the answer. Reference the fruit at hand.`
      : `Question shown: "${prompt}". The student answered: "${studentAnswer}". This is wrong attempt ${attemptNumber}. Give them ONE short redirecting hint that references the FRUIT (apple/watermelon/banana/orange) they're thinking about — never tell them they are wrong, never give the answer outright.`;

  try {
    const completion = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 80,
      system: PIP_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text =
      completion?.content?.[0]?.type === 'text' ? completion.content[0].text.trim() : '';

    if (!text) {
      return res.json({ message: fallback, source: 'fallback' });
    }

    return res.json({ message: text, source: 'claude' });
  } catch (err) {
    console.error('[api/tutor] Claude API failed:', err.message);
    return res.json({ message: fallback, source: 'fallback' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    hasApiKey: Boolean(anthropic),
    model: 'claude-haiku-4-5',
    questionCount: Object.keys(FALLBACK).length,
    theme: 'fruit',
  });
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Fraction Fruit Lab listening on http://localhost:${PORT}`);
  console.log(`Claude API: ${anthropic ? 'enabled' : 'disabled (scripted fallback only)'}`);
});
