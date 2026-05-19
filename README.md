# Fraction Fruit Lab 🍎

An iPad-first web tutor that teaches fractions to 9-year-olds through hands-on fruit manipulatives, hosted by **Pip the apple seed**. From a lesson hub, the kid picks one of **three lessons**:

1. **Same Size, New Name** 🍎 — fraction *equivalence* (`1/2 = 2/4`). Slice a half-apple into two quarters, squish them back, and watch the same half re-form. The idea then carries across watermelon, banana, and orange so the kid learns equivalence is a property of *the math*, not the fruit.
2. **Which is Bigger?** ⚖️ — *comparing* fractions. A half-apple shown next to a smaller quarter teaches that more pieces means each piece is smaller (`1/2 > 1/4`).
3. **Adding Fractions** ➕ — *adding* same-denominator fractions. Two quarter-pieces combine into `2/4` — add the tops, keep the bottom.

Each lesson follows the same explore → instruct → check arc. Completed lessons get a ✓ on the hub.

Built for the Synthesis Tutor 1-week challenge (Week 4).

> "Pip" is what apple seeds are actually called. The mascot earned its name.

## Demo

🍎 **Live app:** <https://web-production-44b1.up.railway.app>

Open the URL on an iPad in Safari (or Chrome DevTools → device mode → iPad) for the intended experience.

---

## Run it locally

```bash
cd fraction-sponge
npm install
cp .env.example .env
# edit .env and paste your ANTHROPIC_API_KEY
npm start
```

Then open <http://localhost:3000> — in Chrome DevTools, switch to iPad device mode for the intended experience.

The app degrades gracefully if `ANTHROPIC_API_KEY` is missing: scripted fallback hints take over, the happy path is unaffected.

---

## Technical approach

| Layer    | Choice                                |
| -------- | ------------------------------------- |
| Frontend | Vanilla HTML/CSS/JS — no framework    |
| Backend  | Node.js + Express                     |
| AI       | Anthropic Claude (`claude-haiku-4-5`) |
| Hosting  | Railway                               |

### How the pieces fit

```text
manipulative.js  ──emits──▶  pieceAction events
                                   │
tutorScript.js   (state machine — pure data, no DOM)
                                   │
app.js  ──renders Pip + choices ◀──┘
        ──POST /api/tutor──▶  server.js  ──▶  Claude API
                                              │
                                              └─▶ scripted fallback on failure
```

- **`public/manipulative.js`** — the workspace. Knows the visual states (`half`, `quarters`, `merged`) and exposes `split()` / `smash()` / `reset()` / `celebrate()` as promise-returning calls so the tutor can sequence them.
- **`public/tutorScript.js`** — a **registry of all three lessons**, each a self-contained object with `stages` + `checkQuestions`. A lesson runner tracks the active lesson and walks it through `idle → … → check → win`, where `check` iterates that lesson's question bank. The hub calls `loadLesson(id)`. Pure logic, no DOM access.
- **`public/app.js`** — the glue. Renders Pip's messages, answer-choice buttons, drives transitions, calls `/api/tutor` for hints, falls back to scripted text on failure.
- **`server.js`** — Express server serving `public/` plus a single `POST /api/tutor` endpoint that proxies to Claude. The Anthropic key never reaches the client.

### When Claude gets called

The happy path is fully scripted — fast, predictable, and works offline. The Claude API is invoked **only** when:

1. The student picks a wrong check-question answer → Pip returns a hint that references the physical manipulative.
2. The student gets the same question wrong twice → Pip re-phrases the question so it doesn't feel repetitive.

`max_tokens: 80`, system prompt enforces Pip's persona (never says "wrong," always references what the student did).

### Lesson flow

> Shown for Lesson 1 (Same Size, New Name). Lessons 2 and 3 follow the same explore → instruct → check arc with their own manipulative and questions.

1. **Explore** — Pip greets, kid taps **🔪 Slice it!** → the half-apple splits into two quarter-pieces (inline SVG with seeds, cut-face, stem, leaf).
2. **Squish** — Kid taps **🤲 Squish them together!** → pieces shake, flash, merge. Equation `1/2 = 2/4` appears with apple visuals.
3. **Check** — Seven questions across four fruits — equivalence is a property of the math, not the fruit:

   | #   | Fruit     | Question                                          | Skill                            |
   | --- | --------- | ------------------------------------------------- | -------------------------------- |
   | 1   | 🍎 apple  | Which is bigger, 1/2 or 2/4 of the apple?         | *compare*                        |
   | 2   | 🍎 apple  | How many quarters fit in one half?                | *count*                          |
   | 3   | 🍕 pizza  | Is 3/6 of a pizza the same as 1/2?                | *apply* (new fruit)              |
   | 4   | 🍕 pizza  | How many sixth-slices fit in half a pizza?        | *count* (applied)                |
   | 5   | 🍌 banana | Is 1/3 of a banana the same as 2/6?               | *transfer* (new base fraction)   |
   | 6   | 🍎🍌      | Is 1/2 of an apple the same as 1/3 of a banana?   | *discriminate* (non-equivalent)  |
   | 7   | 🍊 orange | Is 4/8 of an orange the same as 1/2?              | *capstone* (larger denominator)  |

4. **Win** — Fruit-themed confetti, win message, **Play Again** resets both the manipulative and the tutor.

The question bank lives in `public/tutorScript.js` — each entry has a `fruit` emoji, prompt, choices, cheer, hints, and a rephrase. Add or remove entries to dial up or down.

---

## Deploy to Railway

1. Push the repo to GitHub.
2. Railway → New Project → Deploy from GitHub repo.
3. Under **Settings → Variables**, set `ANTHROPIC_API_KEY`.
4. Railway auto-deploys on `git push`. The app reads `PORT` from the environment.

---

## File structure

```text
fraction-sponge/
├── server.js              Express + /api/tutor
├── package.json
├── railway.json           Railway deploy config
├── Procfile               Heroku-style start command
├── .env.example
├── .gitignore
├── README.md
├── ipad-roadmap.md        iPad design rationale + on-device test list
├── demo-script.md         Beat-by-beat 3-5 min video storyboard
├── deploy-checklist.md    Step-by-step git push → Railway → live URL
├── public/
│   ├── index.html         Two-panel app shell
│   ├── style.css          Design tokens + responsive layout
│   ├── manipulative.js    Workspace (split/smash/reset)
│   ├── tutorScript.js     Lesson state machine + 7-question check bank
│   └── app.js             Wiring layer
├── evals/                 Eval suite for the /api/tutor endpoint
│   ├── README.md          how to run
│   ├── rubric.md          what's being checked and why
│   ├── golden.json        20 hand-curated test cases
│   ├── rules.js           deterministic rule checks
│   ├── judge.js           optional Claude-as-judge (JUDGE=1)
│   └── run.js             harness — boots server, scores, prints
└── .claude/               Claude Code workspace settings
    ├── settings.json      PostToolUse hook → eval reminder
    └── hooks/
        └── post-edit-check.js
```

## Evals

Pip's voice is the product — and AI output regresses silently. The `evals/` folder catches regressions before they reach a 9-year-old.

```bash
npm run eval          # rule-based, free, no API calls for evaluation
npm run eval:judge    # adds an LLM-as-judge layer (needs ANTHROPIC_API_KEY)
npm run eval:verbose  # show actual responses inline
```

The harness boots the server on port 3100, sweeps 20 cases through `POST /api/tutor`, scores each response against [rubric.md](evals/rubric.md), and exits 0 on PASS / 1 on FAIL. Wire into CI via the exit code.

Tutor-critical file edits (server.js, tutorScript.js, manipulative.js, app.js) trigger a Claude Code PostToolUse hook reminding you to re-run the suite. Advisory only — never blocks.

---

## Browser support

- **Safari on iPad (iOS 16+)** — primary target
- **Chrome on desktop / Android** — secondary

Touch targets ≥ 60px. No pinch-zoom (locked viewport). Web Audio synthesises all sound on the fly — no audio file downloads.

---

## Accessibility

The app is designed touch-first and text-first, which makes it usable for **Deaf, hard-of-hearing, and non-speaking users** out of the box. Every spoken cue has a visual equivalent.

| Feature | What it does | Where |
|---|---|---|
| **Voice narration (TTS)** | Pip's chat bubbles are read aloud via the browser's Web Speech API. Fractions are normalized to words ("one half" not "one slash two"); emoji are stripped. Toggle via the **🔊** button in the chat header; preference persists. **On by default.** Note: browsers block speech until the first user tap (autoplay rule). | [public/voice.js](public/voice.js) |
| **Sound captions** | Every sound effect (slice, squish, ding, hmm, hooray, etc.) surfaces as a floating badge near the top of the screen. Toggle on/off via the **CC** button in the chat header; preference persists in `localStorage`. **On by default.** | [public/captions.js](public/captions.js) |
| **No-audio fallback** | Sound is always *enhancement*, never the only signal. Splits animate, smashes flash, equations reveal, confetti shows. The lesson is fully playable with the device muted. | inherent in the design |
| **Touch-only** | Every interaction is a tap. No voice input. Non-speaking users have zero friction. | [public/app.js](public/app.js) |
| **Reduced motion** | If the OS reports `prefers-reduced-motion: reduce`, bouncy springs, shakes, and spinning confetti are replaced with simple fades. Vestibular-sensitive users included. | `@media (prefers-reduced-motion: reduce)` in [public/style.css](public/style.css) |
| **Screen-reader support** | ARIA-live regions on the chat (`polite`) and win message (`assertive`); descriptive `aria-label` on action buttons; `aria-describedby` on each answer choice pointing back to its question. | [public/index.html](public/index.html), [public/app.js](public/app.js) |
| **High contrast** | WCAG AA color contrast on all text. `@media (forced-colors: active)` adds explicit borders so the app survives Windows High Contrast and similar modes. | [public/style.css](public/style.css) |
| **Touch targets** | All interactive elements ≥ 60×60 px including the CC toggle. | [public/style.css](public/style.css) |
| **Font sizes** | Body text 16px+, Pip bubbles 1rem, choice buttons 1.02rem. | [public/style.css](public/style.css) |

### Sound caption examples

- **Slice** → `✂️ slice!`
- **Squish** → `🤲 squish!`
- **Equation reveal** → no caption (just the chord plays)
- **Correct answer** → `✨ yes!`
- **Wrong answer** → `💭 hmm…`
- **Fruit transition** → `🌟 new fruit!`
- **Win arpeggio** → `🎉 hooray!`

The captions module dispatches no audio of its own — it just listens for `soundPlayed` events that [public/manipulative.js](public/manipulative.js) emits whenever any sound plays. This decouples the audio code from the visual indicator and makes adding new sounds trivial.
