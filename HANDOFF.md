# Session Handoff — Fraction Fruit Lab

> Pick-up-cold context for resuming work in a fresh session. Last updated mid-deploy on **2026-05-20**.

---

## The goal

Build a **Synthesis-style web math tutor** for the Gauntlet Week 4 challenge. A 9-year-old opens a URL on an iPad, plays through interactive fraction lessons with a conversational tutor + digital manipulative. **Demo deadline: Friday 2026-05-22, 12:00 noon.**

Contact/owner: Pavan (pavan.kom@gmail.com). Challenge contact: patrick.skinner@superbuilders.school.

---

## What this app is now

**Fraction Fruit Lab** — Pip the apple-seed tutor hosts a **3-lesson hub**:

1. **Same Size, New Name** 🍎 — equivalence (`1/2 = 2/4`). Slice a half-apple into two quarters, squish back. Then a 7-question multi-fruit check (apple → watermelon → banana → apple-vs-banana → orange).
2. **Which is Bigger?** ⚖️ — comparing (more pieces = smaller). 5 questions.
3. **Adding Fractions** ➕ — add the tops, keep the bottom (`1/4 + 1/4 = 2/4`). 5 questions.

Pick a lesson → explore → instruct → check → win → back to hub (completed lessons get a ✓).

Extra features shipped: British-accent TTS voice narration (Peppa-Pig style, pitched up, pinned per session), sound effects + sound captions (Deaf/HoH), reduced-motion + screen-reader support, progress dots (kept out of spoken text), "Lesson Complete" badge.

---

## Tech + repo

- **Stack:** Node.js + Express, vanilla HTML/CSS/JS, Anthropic `claude-haiku-4-5` for wrong-answer hints (scripted fallback if no key).
- **Code:** `c:\Pavan\AI Projects\Guantlet\Week 4 - AI Tutoring\fraction-sponge\`
- **GitHub:** <https://github.com/pavankomateedi/fraction-sponge> (public, `main`). `gh` CLI authenticated as `pavankomateedi`.
- **Latest commit:** `96ef3bd` (AWS hosting artifacts). Working tree clean, synced with origin.
- **Architecture:** `manipulative.js` (workspace, emits `pieceAction`, `showFruit()`, `compareSizes()`, `addingCombine()`, audio via `playSound()`) → `tutorScript.js` (LESSONS registry: equivalence/comparing/adding, each with stages+checkQuestions; runner tracks active lesson) → `app.js` (hub + glue + renders Pip, dispatches `stage.manip`) → `captions.js` + `voice.js` (a11y) → `server.js` (`POST /api/tutor`, FALLBACK hints keyed q1-q7/c1-c5/a1-a5, `/api/health`).

### Verify commands (run from the repo dir)
```bash
npm run eval                 # local: boots server on :3100, 26 cases, expect 100%
npm run preflight            # checks the default (Railway) URL
PREFLIGHT_URL=<url> npm run preflight   # check any URL
EVAL_BASE_URL=<url> npm run eval        # eval against any URL
```
Last local eval: **26/26 cases, 156/156 rule checks (100%)**. Prod-mode boot shows `questionCount: 17`.

---

## ⏳ WHERE WE ARE RIGHT NOW (the active thread)

**Hosting migration, in progress.** The 3-lesson hub is built + pushed but **NOT live anywhere yet** — the live URL still serves the OLD 7-question build.

### Hosting history
- **Railway** (`https://web-production-44b1.up.railway.app`) — original host. Went **down** mid-session (platform incident: 503 API / 404 app) and never deployed the 3-lesson hub. Still serving the old build OR down. **Decision: keep it as a fallback** — it auto-deploys `main` when it recovers.
- **AWS App Runner** — chosen first, then discovered it's **closed to new customers** (since 2026-04-30). Unusable. (`apprunner.yaml` + `Dockerfile` were added to the repo for it; harmless — Railway pins NIXPACKS so the Dockerfile doesn't affect it.)
- **AWS ECS Express Mode** — tried; needs a container image in **ECR** (AWS CLI + IAM key + docker push). Too many steps; skipped.
- **AWS Elastic Beanstalk** — ✅ **CHOSEN. Currently deploying.**

### Elastic Beanstalk deploy state (as of handoff)
- Region: **us-east-2 (Ohio)**
- Application: **`fraction-fruit-lab`**
- Environment: just **launched** (provisioning, ~5 min) — was waiting for green + Domain URL
- Platform: **Node.js 20 / Amazon Linux 2023**, **Single instance (free-tier eligible)**
- Code: uploaded **`fraction-fruit-lab-eb.zip`** (built via `git archive`, lives at `c:\Pavan\AI Projects\Guantlet\Week 4 - AI Tutoring\fraction-fruit-lab-eb.zip` — one level ABOVE the repo)
- Roles: `aws-elasticbeanstalk-service-role` + `aws-elasticbeanstalk-ec2-role` (created during setup)
- Env vars set in EB: `ANTHROPIC_API_KEY`, `NODE_ENV=production`
- EB reads `Procfile` (`web: npm start` → `node server.js`); app honors `process.env.PORT` (EB uses 8080).

### 👉 NEXT STEPS (do these first in the new session)
1. **Get the EB Domain URL** from the user (or AWS console → Elastic Beanstalk → Environments → the env → Domain). Looks like `fraction-fruit-lab.eba-xxxx.us-east-2.elasticbeanstalk.com`.
2. Run `PREFLIGHT_URL=https://<eb-url> npm run preflight` and `EVAL_BASE_URL=https://<eb-url> npm run eval`.
3. **If green:** edit `README.md` "## Demo" → swap Railway URL for the EB URL; commit + push.
4. **If red (Degraded/Severe):** diagnose from EB **Logs → Last 100 lines**. Usual causes: missing `ANTHROPIC_API_KEY` (app still runs, scripted fallback) or port mismatch (shouldn't happen — app reads `process.env.PORT`).
5. Rebuild the EB zip when code changes: `git archive --format=zip -o ../fraction-fruit-lab-eb.zip HEAD` then re-upload via EB → Upload and deploy.

---

## Still-pending product deliverables (pre-existing, need the user)
- **Demo video** — 1-2 min (brief) vs 3-5 min (PRD) still undecided. Script in `demo-script.md`, talking points in `talking-points.md`.
- **iPad on-device test** — checklist in `ipad-roadmap.md §6`.
- **Browser walkthrough** of the live build end-to-end.

---

## Key decisions + gotchas (don't re-litigate)
- **Pip stays** as the mascot — an apple seed is literally a "pip".
- **Watermelon replaced pizza** (Q3-Q4) — pizza isn't a fruit. No "pizza" references remain.
- **Voice:** pinned **British en-GB** voice, pitch 1.25, locked once per session so it never flips mid-lesson. Toggle 🔊 in chat header (default on).
- **Progress counter must NOT be in the spoken prompt** — TTS reads "(3/7)" as "three sevenths". It lives in a separate dots indicator.
- **Lesson-loop bug fixed:** `advance()` explicitly does check→win (the `check` stage has no entry in `stages`).
- **Captions** (sound→text badges) toggle CC in header, default on; persisted in localStorage.
- Eval `rules.js` `MANIPULATIVE_REFS` includes comparing/adding vocab (bigger/smaller/share/top/bottom/add) so those hints pass.
- Browsers block audio + speech until first user tap (iOS autoplay rule) — first sound fires on the first button tap. This is expected, not a bug.
- Cost note: EB single-instance is free-tier for ~12 months on a new account. To stop billing later: EB → Actions → Terminate (or keep it).

---

## Auto-memory
Cross-session facts are also in the auto-memory: `project-fraction-sponge`, `project-fraction-sponge-decisions`, `reference-fraction-sponge-docs`. Design docs (PRD, lesson-design, build-plan) live in OneDrive at `C:\Users\pavan\OneDrive\Documents\Claude\Projects\AI Tutoring App\` — NOT in the repo.
