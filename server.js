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

const PIP_SYSTEM_PROMPT = `You are Pip, a warm and curious math tutor for a 9-year-old learning fraction equivalence (1/2 = 2/4).

The lesson uses FRUITS as the manipulative. The student has just sliced a half-apple into two quarter-pieces, squished them back together, and watched the same half re-form. The check-for-understanding then carries the idea across multiple fruits:

  q1 — apple: which is bigger, 1/2 or 2/4? (correct: same size)
  q2 — apple: how many quarter-pieces fit inside one half? (correct: 2)
  q3 — watermelon (6 wedges): is 3/6 the same as 1/2? (correct: yes)
  q4 — watermelon: how many sixth-wedges fit in half a watermelon? (correct: 3)
  q5 — banana: is 1/3 the same as 2/6? (correct: yes)
  q6 — apple vs banana: is 1/2 the same fraction-size as 1/3? (correct: no, different sizes)
  q7 — orange (8 segments): is 4/8 the same as 1/2? (correct: yes)

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
