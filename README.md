# Fraction Fruit Lab 🍎

A one-lesson, iPad-first web tutor that teaches **fraction equivalence** (`1/2 = 2/4`) to 9-year-olds. The kid slices a half-apple into two quarters, squishes them back together, and watches the same half re-form — then Pip (the apple seed) carries the idea across pizza, banana, and orange so the kid learns equivalence is a property of *the math*, not the fruit.

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
- **`public/tutorScript.js`** — the lesson script as a state machine: `idle → split → smash → check → win`, where `check` iterates through a 7-question bank. Pure logic, no DOM access.
- **`public/app.js`** — the glue. Renders Pip's messages, answer-choice buttons, drives transitions, calls `/api/tutor` for hints, falls back to scripted text on failure.
- **`server.js`** — Express server serving `public/` plus a single `POST /api/tutor` endpoint that proxies to Claude. The Anthropic key never reaches the client.

### When Claude gets called

The happy path is fully scripted — fast, predictable, and works offline. The Claude API is invoked **only** when:

1. The student picks a wrong check-question answer → Pip returns a hint that references the physical manipulative.
2. The student gets the same question wrong twice → Pip re-phrases the question so it doesn't feel repetitive.

`max_tokens: 80`, system prompt enforces Pip's persona (never says "wrong," always references what the student did).

### Lesson flow

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
