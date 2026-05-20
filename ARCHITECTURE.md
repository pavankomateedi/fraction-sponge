# Architecture — Fraction Fruit Lab

Two views: the **runtime/component flow** (what happens in the browser + server during a lesson) and the **deployment flow** (how the code gets from your machine to a kid's iPad on AWS).

---

## 1. Runtime / component flow

Everything is vanilla — no framework. The browser loads five small scripts; one Express server serves them and proxies wrong-answer hints.

```text
                          BROWSER (iPad / Chrome)
┌───────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  index.html ── loads ──► manipulative.js   (apple/orange/watermelon     │
│                          │                  pieces, audio, fraction viz)│
│                          │  emits pieceAction / soundPlayed events      │
│                          ▼                                              │
│                       tutorScript.js   (LESSONS registry: equivalence,  │
│                          │              comparing, adding — each with    │
│                          │              stages + checkQuestions; shuffle │
│                          │              + random fruit per playthrough)  │
│                          ▼                                              │
│   captions.js ◄──────  app.js  ──────► voice.js                         │
│   (sound→text         (hub + glue:     (British TTS narration of        │
│    badges, CC          renders Pip,     Pip's lines; 🔊 toggle)          │
│    toggle)             choices, drives  buddy.js (Lily/Max companion)    │
│                        transitions)                                      │
│                          │                                              │
│                          │  POST /api/tutor   (only on a WRONG answer)   │
└──────────────────────────┼──────────────────────────────────────────────┘
                           ▼
                    server.js  (Node + Express)
                    ├─ serves /public  (static HTML/CSS/JS)
                    ├─ GET  /api/health
                    └─ POST /api/tutor
                          │
                          ├─ if ANTHROPIC_API_KEY set ──► Anthropic Claude
                          │                               (claude-haiku-4-5)
                          │                               warm redirect hint
                          └─ else / on failure ─────────► scripted FALLBACK
                                                          (hand-written hint
                                                           for every question)
```

**Key point:** the happy path (all dialogue, branching, the 17 check questions) is **100% scripted in `tutorScript.js`**. The Claude call is an *optional enhancement* used only for wrong-answer hints, and every question has a scripted fallback — so the app runs identically with no LLM at all.

### Request flow on a wrong answer

```text
kid taps a wrong choice
   → app.js: play "hmm" sound, record attempt
   → POST /api/tutor { qId, prompt, studentAnswer, attemptNumber, mode }
   → server.js: build Pip-persona prompt → Claude haiku  (or scripted fallback)
   → { message, source: "claude" | "fallback" }
   → app.js: typing indicator → render Pip's hint bubble (+ voice narration)
   → 8s client timeout falls back to scripted text if the call is slow
```

---

## 2. Deployment flow (AWS — primary)

Hosted on **AWS Elastic Beanstalk** (single-instance, free-tier eligible). Railway is kept as a fallback mirror.

```text
   Developer (local: c:\...\fraction-sponge)
        │
        │  1. git push origin main
        ▼
   GitHub  ── github.com/pavankomateedi/fraction-sponge (main) ──┐
        │                                                        │
        │  2. git archive --format=zip → fraction-fruit-lab-eb.zip│ 3. auto-deploy
        │     (clean: tracked files only, no node_modules/.env)   │    (when up)
        ▼                                                        ▼
   AWS Elastic Beanstalk                               Railway (FALLBACK)
   ┌──────────────────────────────────────────┐       ┌──────────────────────┐
   │ Application:  fraction-fruit-lab          │       │ NIXPACKS build        │
   │ Region:       us-east-2 (Ohio)            │       │ npm start             │
   │ Environment:  single instance (free tier) │       │ HTTPS auto            │
   │ Platform:     Node.js 20 / Amazon Linux 23│       │ (web-production-…     │
   │                                           │       │  .up.railway.app)     │
   │   ┌─────────────────────────────────┐     │       └──────────────────────┘
   │   │ EC2 instance                    │     │
   │   │   Procfile: web: npm start      │     │
   │   │   → node server.js (Express)    │     │
   │   │   reads process.env.PORT (8080) │     │
   │   │   serves /public + /api/tutor   │     │
   │   │   env: ANTHROPIC_API_KEY,       │     │
   │   │        NODE_ENV=production      │     │
   │   └─────────────────────────────────┘     │
   │   Health check: GET /  (200)              │
   └──────────────────────────────────────────┘
        │  HTTP
        ▼
   Kid's browser / iPad
   http://fraction-fruit-lab-env.eba-vygaxiu3.us-east-2.elasticbeanstalk.com
        │
        └─ on a wrong answer ─► /api/tutor ─► Anthropic Claude API (haiku)
```

### Deploy steps (recap)

1. `git push` to GitHub (source of truth).
2. Rebuild the upload bundle: `git archive --format=zip -o ../fraction-fruit-lab-eb.zip HEAD`.
3. EB console → environment → **Upload and deploy** → pick the zip → Deploy (~2 min).
4. Railway, when its platform is healthy, auto-deploys `main` independently as a mirror.

> **HTTPS note:** the EB single-instance environment serves HTTP (no load balancer). Functionally fine (no logins; the API key stays server-side). For a padlock later: add an ALB + ACM cert, or front it with CloudFront, or attach a custom domain.

### Why these choices

| Decision | Why |
|---|---|
| Vanilla JS, no framework | 1-week prototype; fast to load on iPad; nothing to compile |
| Express + one `/api/tutor` route | Keeps the Anthropic key server-side; tiny surface area |
| Scripted core + optional LLM | Brief says scripted is enough; LLM only enriches wrong-answer hints, with full scripted fallback |
| Elastic Beanstalk (single instance) | AWS-native, free-tier for a year, managed Node runtime; chosen after Railway's outage + App Runner being closed to new customers |
| Railway kept as fallback | Free auto-deploy mirror; zero extra effort |
