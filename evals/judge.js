/* ─────────────────────────────────────────
   judge.js — optional Claude-as-judge layer
   For each (case, response), asks claude-haiku-4-5
   to score the response on three dimensions:
     - persona      (warm + curious, not lecturing)
     - pedagogy     (would a teacher/reviewer approve?)
     - answer_leak  (does it accidentally reveal the answer?)
   Gated behind JUDGE=1 env var so default runs are
   free + offline.
   ───────────────────────────────────────── */
'use strict';

require('dotenv').config();

const Anthropic = require('@anthropic-ai/sdk');

const JUDGE_MODEL = 'claude-haiku-4-5';

const JUDGE_SYSTEM_PROMPT = `You are an experienced elementary-school math teacher evaluating an AI tutor's response.

The AI tutor, "Pip," is helping a 9-year-old learn fraction equivalence (1/2 = 2/4). The kid just split a 1/2 block into two 1/4 blocks and smashed them back together. They are now answering check-for-understanding questions.

You will see:
- The question Pip asked the kid
- The kid's wrong answer
- Pip's response (a hint that should redirect without revealing the answer)

Pip's voice rules (these are the bar):
- Never says "wrong," "incorrect," "no," or "not right"
- References what the kid PHYSICALLY did with the blocks (split, smash, fit, pieces)
- Asks a question more often than it tells
- Stays under 2 short lines
- Warm and curious, not lecturing

Score the response on three dimensions, each 0–2:
- persona       0=cold or lectures; 1=neutral; 2=warm, curious, kid-friendly
- pedagogy      0=confuses or misleads; 1=neutral nudge; 2=clear redirect that a teacher would approve
- answer_leak   2=does NOT reveal the answer; 1=hints heavily; 0=gives the answer

Also flag with a one-sentence note if anything would confuse a teacher reviewing the transcript.

Return ONLY a JSON object, no markdown, no preamble:
{
  "persona": 0-2,
  "pedagogy": 0-2,
  "answer_leak": 0-2,
  "note": "one sentence, optional"
}`;

function buildJudgePrompt(golden, response) {
  const { input } = golden;
  return [
    `Question asked: "${input.prompt}"`,
    `Kid's wrong answer: "${input.studentAnswer}"`,
    `Attempt number: ${input.attemptNumber}`,
    `Mode: ${input.mode || 'hint'}`,
    ``,
    `Pip's response: "${response}"`,
  ].join('\n');
}

/**
 * Judge a single response. Returns { persona, pedagogy, answer_leak, note, total, max, source }.
 * If the API call fails or output isn't parseable JSON, returns { source: 'error', error: '...' }.
 */
async function judgeResponse(client, golden, response) {
  try {
    const completion = await client.messages.create({
      model: JUDGE_MODEL,
      max_tokens: 200,
      system: JUDGE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildJudgePrompt(golden, response) }],
    });

    const text = completion?.content?.[0]?.type === 'text' ? completion.content[0].text.trim() : '';
    const parsed = extractJSON(text);
    if (!parsed) {
      return { source: 'error', error: 'non-JSON response from judge', raw: text };
    }

    const persona     = clamp(parsed.persona,     0, 2);
    const pedagogy    = clamp(parsed.pedagogy,    0, 2);
    const answer_leak = clamp(parsed.answer_leak, 0, 2);
    const total       = persona + pedagogy + answer_leak;

    return {
      source: 'claude',
      persona,
      pedagogy,
      answer_leak,
      note: typeof parsed.note === 'string' ? parsed.note.trim() : '',
      total,
      max: 6,
    };
  } catch (err) {
    return { source: 'error', error: err.message };
  }
}

function extractJSON(text) {
  // Tolerate Claude wrapping JSON in code fences or extra prose.
  const fenced = /```(?:json)?\s*([\s\S]*?)\s*```/.exec(text);
  const body = fenced ? fenced[1] : text;
  const objMatch = /\{[\s\S]*\}/.exec(body);
  if (!objMatch) return null;
  try {
    return JSON.parse(objMatch[0]);
  } catch (_) {
    return null;
  }
}

function clamp(n, lo, hi) {
  const x = Number(n);
  if (Number.isNaN(x)) return lo;
  return Math.max(lo, Math.min(hi, x));
}

function makeClient() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

module.exports = {
  judgeResponse,
  makeClient,
  JUDGE_MODEL,
};
