# CLAUDE.md — Fraction Fruit Lab

Lean orientation for Claude Code (and humans). Pointers + the non-obvious gotchas only. Full detail lives in the linked docs.

## What this is
An iPad-first web tutor: Pip (apple-seed mascot) teaches fractions through fruit, across **3 lessons** (equivalence, comparing, adding). Vanilla HTML/CSS/JS + Node/Express. See [README.md](README.md), [ARCHITECTURE.md](ARCHITECTURE.md), and **[HANDOFF.md](HANDOFF.md)** (read HANDOFF first when resuming — it has live URLs + current state).

## Commands (the gate + the deploy)
```bash
npm run eval          # boots server on :3100, runs 26 golden cases — MUST stay 100% after any tutor change
npm run eval:live     # same, against the live AWS URL
npm run preflight     # 30s go/no-go health check of the live URL
npm start             # local dev on :3000
```
**Deploy = AWS Elastic Beanstalk, MANUAL zip upload** (EB does NOT auto-deploy from GitHub):
```bash
git archive --format=zip -o ../fraction-fruit-lab-eb.zip HEAD   # rebuild bundle after every change
# then EB console → environment → Upload and deploy → pick the zip
```
Railway is a fallback mirror (auto-deploys `main` when its platform is up).

## Critical gotchas (these bit us — don't repeat)
- **Scripted core + optional LLM.** All dialogue/branching/17 check questions are scripted in `public/tutorScript.js`. Claude (`claude-haiku-4-5`) is used ONLY for wrong-answer hints, and **every question has a scripted fallback in `server.js`**. The app must keep working with no API key. Don't move happy-path dialogue to the LLM.
- **`npm run eval` is the gate.** Run it after any change to `tutorScript.js` / `server.js` / `manipulative.js` / `app.js`. Keep it 100%.
- **Never put the progress counter in a spoken/prompt string.** TTS reads "(3/7)" as "three sevenths". Progress lives in a separate dots indicator (`renderProgress`).
- **Voice: do NOT re-add `cancel()` inside `voice.speak()`** — it cut Pip off mid-sentence. Pinned to a British en-GB voice; only hard resets cancel.
- **Fruit is per-lesson + count-linked.** equivalence=apple, comparing=orange, adding=watermelon (`manipFruit`). In lesson 1's check, watermelon=6 wedges and orange=8 segments are fixed pairings. **Pizza is banned (not a fruit).**
- **The workspace must track the current question.** Lesson 1's check order is **shuffled each play** and comparing fruit names are **randomized**, so `renderCheckQuestion` calls `showFruit`/`showFractionViz` to keep the right side in sync. Don't assume question order.
- **`check` is a synthetic stage** (not in `stages`); `advance()` special-cases `check → win`. Removing that special case re-introduces the infinite loop.
- **No real-IP characters.** Buddies Lily & Max are original — never use Bluey/Mickey/SpongeBob etc.
- **EB serves HTTP** (single instance, no load balancer). Fine functionally; for HTTPS you'd add an ALB+ACM cert or CloudFront.

## Conventions
- Vanilla JS, **no framework, no new dependencies** without a clear reason.
- **Accessibility-first**: every sound has a visual equivalent (captions); respect `prefers-reduced-motion`; keep ARIA labels.
- Browsers block audio/speech until the first user tap (autoplay) — expected, not a bug.
- Design docs (PRD, lesson-design, build-plan) live in OneDrive, **not** in this repo.

## Scale note
This is a small single-app repo. Org-scale Claude Code practices (subdir CLAUDE.md hierarchies, MCP servers, plugin marketplaces, LSP setup, a config DRI) are intentionally **not** used here — they'd be overkill. Revisit if this grows into a multi-app codebase.
