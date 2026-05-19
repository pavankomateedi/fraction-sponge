# Fraction Sponge 🧽

A one-lesson, iPad-first web tutor that teaches **fraction equivalence** (`1/2 = 2/4`) to 9-year-olds. The kid splits a half into two fourths, smashes them back together, and watches the same shape reappear — Pip the sponge guides the discovery and then runs a quick seven-question check for understanding.

Built for the Synthesis Tutor 1-week challenge (Week 4).

## Demo

🧽 **Live app:** <https://web-production-44b1.up.railway.app>

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

1. **Explore** — Pip greets, kid taps **Split** → manipulative splits 1/2 into two 1/4 blocks.
2. **Smash** — Kid taps **Smash** → pieces shake, flash, merge. Equation `1/2 = 2/4` appears.
3. **Check** — Seven progressive questions:
   1. Which is bigger, 1/2 or 2/4? — *compare* (recall)
   2. How many fourths fit in one half? — *count* (recall)
   3. Is 3/6 the same as 1/2? — *apply* (new equivalent)
   4. How many sixths fit in one half? — *count* (apply)
   5. Is 1/3 the same as 2/6? — *transfer* (new base fraction)
   6. Is 1/2 the same as 1/3? — *discriminate* (non-equivalent)
   7. Is 4/8 the same as 1/2? — *capstone* (larger denominator)
4. **Win** — Confetti, win message, **Play Again** resets both the manipulative and the tutor.

The question bank lives in `public/tutorScript.js` — to dial up or down, just add or remove entries from `checkQuestions[]`.

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
