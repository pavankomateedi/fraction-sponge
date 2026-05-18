# Fraction Sponge — Evals

A small, focused eval suite for the `/api/tutor` endpoint that powers Pip's wrong-answer hints and question rephrasing. The harness boots the server, runs every case in `golden.json` through real HTTP requests, scores each response, and prints a scorecard. Optional LLM-as-judge layer for warmth and pedagogy.

For the design philosophy behind the rubric, see [rubric.md](rubric.md).

---

## Quick start

```bash
# Rule-based only — fast, free, no API calls for evaluation
npm run eval

# Rule-based + LLM judge (requires ANTHROPIC_API_KEY)
npm run eval:judge

# Show actual responses inline
EVAL_SHOW_RESPONSES=1 npm run eval

# Show server logs too
EVAL_VERBOSE=1 npm run eval
```

The harness boots `node server.js` on port **3100** (not 3000 — so it won't clash with your dev server), runs the cases, and shuts down.

---

## What you'll see

```
╭─ Fraction Sponge · /api/tutor evals ─╮

Loaded 20 cases from evals/golden.json
Mode   rules + judge

→ Booting server on port 3100…
→ Health: Claude API live — testing real model output

Cases

  ✓ q1-bigger-half-a1  rules 6/6  claude  judge 6/6 (p2|t2|l2)  [compare,common-misconception,denominator-bigger-fraction]
  ✓ q1-bigger-2-4-a1   rules 6/6  claude  judge 5/6 (p2|t2|l1)  [compare,wrong-pick]
  ! q1-rephrase-a2     rules 5/6  claude  judge 6/6 (p2|t2|l2)  [rephrase,compare]
     ↳ notRepeatingPrompt: 62% token overlap with the original question
  ✓ q2-one-fourth-a1   rules 6/6  claude  judge 6/6 (p2|t2|l2)  [count,off-by-one]
  ...

Summary
  Rule checks:  108/120  (90.0%)
  Full passes:  16/20  (cases where every rule passed)
  Judge score:  112/120  (93.3%) across 20 cases

✓ PASS  threshold 85%, achieved 90.0%
```

---

## Interpretation

| Symbol | Meaning |
|---|---|
| ✓ green | Every rule passed |
| ! yellow | Most rules passed but at least one failed (4+ pass) |
| ✗ red | Multiple rule failures or a harness error |
| `claude` tag | Response came from the live Claude API |
| `fallback` tag | Response came from scripted `FALLBACK` table in [server.js](../server.js) |
| `judge X/6 (p|t|l)` | Judge total / max, broken into persona, pedagogy, leak |

An overall PASS requires (a) rule pass-rate ≥ 85% AND (b) judge score ≥ 75% (when judge is enabled) AND (c) no harness errors. Override with env vars below.

---

## Tuning

| Env var | Default | Purpose |
|---|---|---|
| `JUDGE` | unset | Set to `1` to enable the LLM judge |
| `EVAL_PORT` | 3100 | Port the harness boots the server on |
| `EVAL_PASS_THRESHOLD` | 0.85 | Minimum rule pass rate for overall PASS |
| `EVAL_JUDGE_THRESHOLD` | 0.75 | Minimum judge total/max for overall PASS |
| `EVAL_CONCURRENCY` | 4 | Parallel in-flight requests |
| `EVAL_TIMEOUT_MS` | 12000 | Per-request timeout |
| `EVAL_SHOW_RESPONSES` | unset | Print the actual response under each case |
| `EVAL_VERBOSE` | unset | Pipe server stdout/stderr through |

---

## Files

```
evals/
├── README.md         (this file)
├── rubric.md         what's being checked and why
├── golden.json       hand-curated test cases
├── rules.js          deterministic rule implementations
├── judge.js          LLM-as-judge (Claude Haiku)
├── run.js            harness — boots server, scores, prints
└── last-run.json     auto-written after each run for diffing
```

---

## Extending the dataset

When you add or change a check question in [`public/tutorScript.js`](../public/tutorScript.js):

1. Add 2–3 cases to `golden.json` for the new `qId`:
   - One common wrong answer at `attemptNumber: 1` in `hint` mode
   - One alternative wrong answer
   - One at `attemptNumber: 2` in `rephrase` mode
2. Add a `tags` array for slicing in the scorecard
3. Write a short `notes` field describing the misconception
4. If the new question introduces concepts that need a new rule (e.g., "no negative numbers" for a different lesson), add it to `rules.js`

Run `npm run eval` — it should still pass.

---

## CI

The harness exits **0 on PASS** and **1 on FAIL** (2 on harness errors). To wire it into GitHub Actions:

```yaml
- run: npm install
- run: npm run eval
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

For PR builds you may want `npm run eval:judge` on the main branch only (judge calls cost ~20 Claude requests per run).

---

## Limitations

- The dataset is hand-curated, not stratified by frequency. Real student error distributions might differ.
- Judge non-determinism: two runs of the same dataset can vary by a point or two. Don't take a single judge score too seriously.
- The harness boots a fresh server on each run — no persistent state between cases (intentional).
- No regression diff yet: `last-run.json` is written but not auto-compared to previous runs. Easy to add when needed.
