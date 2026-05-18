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

const PIP_SYSTEM_PROMPT = `You are Pip, a warm and curious math tutor for a 9-year-old learning fraction equivalence.

The student has just split a 1/2 block into two 1/4 blocks, smashed them back together, and watched the same shape reappear. They are now answering a check-for-understanding question.

Voice rules — never break these:
- Short sentences. Maximum two short lines.
- Never use the words "wrong," "incorrect," "no," or "not right."
- Redirect by referencing what they JUST DID with the physical blocks ("when you smashed them...", "look at the bar...", "remember when the pieces lined up?").
- Use "Hmm…", "I wonder…", "Did you see that?!" Be curious WITH the kid, not above them.
- One emoji max. Used sparingly.
- Never lecture. Ask a question that points them back to the evidence.

You will be given the exact question they're answering, their answer, and the attempt number.
Return ONLY the tutor's next message — no preamble, no quotes, no JSON. Plain text, under 25 words.`;

// Scripted fallback hints, keyed by question id. Used when:
//   - No API key is configured, or
//   - The Claude API call fails (timeout, rate limit, network).
// hints[attemptNumber - 1], clamped to the last entry.
const FALLBACK = {
  q1: {
    hints: [
      'Hmm — when you smashed the two fourths together, did they fit perfectly into the half? What does that tell you? 🤔',
      "Look at the bar at the top. The orange and the two pieces cover the same space, right? So they're the…?",
    ],
    rephrase: 'Take another look. Which one wins — 1/2 or 2/4 — or is something else going on? 🤔',
  },
  q2: {
    hints: [
      'Picture the smash you just did. Two pieces snapped back into one half — how many is that?',
      'One half = two fourths. So how many fourths fit inside one half? Count them in your head 🧠',
    ],
    rephrase: 'Try again — how many one-fourth pieces snap together to make one half?',
  },
  q3: {
    hints: [
      'Imagine cutting the half into 6 little pieces. Half of 6 is... how many? 🤔',
      'Same idea as 2/4 — just smaller pieces. Three out of six covers the same half.',
    ],
    rephrase: 'Different shape — if a whole splits into 6 pieces and you take 3, how much do you have?',
  },
  q4: {
    hints: [
      'If 1/2 = 3/6, then how many sixths are inside that half? Peek at the fraction 👀',
      'Half of 6 little pieces is... how many pieces?',
    ],
    rephrase: 'Picture cutting the half into 6 even slivers. Count them — what is the number?',
  },
  q5: {
    hints: [
      'Same trick! If two fourths = one half, would two sixths = one third?',
      'Cut a third into two smaller pieces — what would each be called?',
    ],
    rephrase: 'Different fraction this time — does 1/3 equal 2/6?',
  },
  q6: {
    hints: [
      'Hmm — if you split a bar into 2 pieces vs 3 pieces, are the pieces the same size? 🤔',
      'Bigger denominator means smaller pieces. One slice of 3 is smaller than one slice of 2.',
    ],
    rephrase: 'Compare carefully: is one piece out of 2 the same as one piece out of 3?',
  },
  q7: {
    hints: [
      'If you cut your half into 8 tiny pieces, how many would cover the half? 🤔',
      'Half of 8 is... 4. So 4 out of 8 = 1/2!',
    ],
    rephrase: 'Four of eight pieces — does that equal one of two pieces?',
  },
};

function fallbackHint(qId, attemptNumber) {
  const entry = FALLBACK[qId];
  if (!entry || !entry.hints?.length) {
    return "Hmm — let's look at the pieces again. What did you see when you smashed them? 🤔";
  }
  const idx = Math.min(Math.max(0, attemptNumber - 1), entry.hints.length - 1);
  return entry.hints[idx];
}

function fallbackRephrase(qId) {
  return FALLBACK[qId]?.rephrase || 'Take another look at the pieces. What do you notice? 🤔';
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
      ? `The student is on question: "${prompt}". They got it wrong on attempt ${attemptNumber}. Re-ask the same question in different, gentler words. Stay short and warm. Do NOT give them the answer.`
      : `Question shown: "${prompt}". The student answered: "${studentAnswer}". This is wrong attempt ${attemptNumber}. Give them ONE short redirecting hint that references the physical blocks they smashed — never tell them they are wrong, never give the answer outright.`;

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
  });
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Fraction Sponge listening on http://localhost:${PORT}`);
  console.log(`Claude API: ${anthropic ? 'enabled' : 'disabled (scripted fallback only)'}`);
});
