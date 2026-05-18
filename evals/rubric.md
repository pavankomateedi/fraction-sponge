# Pip Response Rubric

Every Pip response from `POST /api/tutor` is judged against this rubric. The rules layer (in `rules.js`) is deterministic and runs on every eval invocation. The judge layer (in `judge.js`) is an LLM-as-judge using `claude-haiku-4-5` and only runs when `JUDGE=1` is set.

---

## Why this rubric exists

Pip's voice is the product. A warm, curious tutor that never says "wrong" turns a math drill into discovery. When we change the system prompt, the fallback hints, or the question bank, *something* about Pip's behavior moves — and we want to catch regressions before they reach a 9-year-old.

---

## Rule layer (deterministic, every run)

| Rule | Applies to | What it checks | Why |
|---|---|---|---|
| `noBannedWords` | all responses | Response does NOT contain "wrong", "incorrect", "not right", "isn't right", "nope", or a standalone "no" | [lesson-design.md voice rules](../../OneDrive/Documents/Claude/Projects/AI%20Tutoring%20App/lesson-design.md): Pip never says "wrong." A 9-year-old should never feel judged. |
| `underLength` | all responses | Trimmed length ≤ 220 chars (rough proxy for "≤2 short lines") | PRD §4.3 — Pip's lines must be short. Long bubbles feel like lectures. |
| `notTooShort` | all responses | Trimmed length ≥ 10 chars | Catches API edge cases where Claude returns an empty or trivial string. |
| `maxOneEmoji` | all responses | At most one emoji in the response | Lesson-design: "One emoji max." Multiple emojis look childish in a way that turns kids off. |
| `asksQuestion` | all responses | Contains a `?` | Pip's tone is questioning, not telling. The lesson is built on the kid figuring it out. |
| `referencesManipulative` | hint mode only | Contains at least one of: split, smash, piece(s), block(s), fit(s), snap(ped), bar, half, fourth(s), sixth(s), eighth(s), cover(ed), cut | A hint that doesn't point back to the physical manipulative isn't using the affordance the lesson is built on. |
| `notRepeatingPrompt` | rephrase mode only | < 60% token overlap with the original question | If Pip just re-reads the question, the rephrase mode is useless. |

A case is a "full pass" when every applicable rule passes. The overall metric is the percentage of total rule checks that passed.

---

## Judge layer (LLM-as-judge, opt-in via `JUDGE=1`)

The judge sees the question, the kid's wrong answer, and Pip's response — and scores three dimensions 0–2:

| Dimension | 0 | 1 | 2 |
|---|---|---|---|
| **persona** | cold or lectures | neutral | warm, curious, kid-friendly |
| **pedagogy** | confuses or misleads | neutral nudge | a teacher reviewing the transcript would approve |
| **answer_leak** | gives the answer | hints heavily | does NOT reveal the answer |

The judge also returns an optional one-sentence `note` flagging anything that would confuse an adult reviewing the transcript.

Max total per case: **6/6**. Pass threshold across the run: **75%** of the total possible (override with `EVAL_JUDGE_THRESHOLD`).

### Why a separate "tutor persona" check?

Per project decisions, the app serves *both* a kid (playing) and a tutor/reviewer (watching the transcript). The rule layer catches voice-rule violations; the judge catches the subtler "would a real teacher approve of this?" question. Together they cover both personas.

---

## Pass thresholds

| Layer | Default threshold | Env override |
|---|---|---|
| Rules | 85% of all rule checks pass | `EVAL_PASS_THRESHOLD=0.9` |
| Judge | 75% of max judge score | `EVAL_JUDGE_THRESHOLD=0.8` |

A run is a PASS when all enabled layers meet their thresholds and there are no harness errors.

---

## When you should change the rubric

| Trigger | What to update |
|---|---|
| Adding a new check question to `tutorScript.js` | Add 2–3 cases to `golden.json` for that question id (one common wrong answer, one rephrase) |
| Changing Pip's voice rules in the system prompt | Update `BANNED_PATTERNS` in `rules.js` if a new banned phrase appears |
| Loosening or tightening length limits | Update `underLength` default in `rules.js` |
| Adding a new fraction concept (e.g., addition) | Likely need a separate eval file — fraction-equivalence rubric isn't applicable |

---

## What this rubric does NOT cover

- **Animation smoothness, audio quality, visual polish** — those are UX checks, run on the live app, not in evals
- **Latency / cost** — not gated here. The 8s client timeout caps user impact; cost is bounded by `max_tokens: 80`
- **Adaptive difficulty** — out of scope for the 1-week build
- **Multi-turn coherence across attempts** — partially covered (attempt-2 rephrase cases) but not a multi-turn judge

If you find Pip doing something a teacher would frown at and there's no rule for it: add a case to `golden.json` with notes, then if it keeps regressing, codify it as a rule in `rules.js` or expand the judge prompt.
