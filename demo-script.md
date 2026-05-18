# Demo Video — Beat-by-Beat Script

**Target:** 3–5 min total. **Tool:** Loom, QuickTime, or OBS. **Aspect:** 16:9 1080p. **Audio:** narrate live, no music needed.

The structure below maps to the PRD §6 deliverable and the build-plan Thursday §4 outline.

---

## Pre-flight (do once before hitting record)

- [ ] Deployed URL is live and loaded in Safari on the iPad
- [ ] Backup: Chrome DevTools open on the desktop, set to iPad device mode (1024×768) loading the same URL
- [ ] Sound is on — Web Audio chimes are part of the experience
- [ ] Close all Slack / email / notification surfaces
- [ ] Phone on silent
- [ ] Have the architecture diagram (`architecture.svg`) open in a second tab/window

---

## 0:00–0:30 — Frame the problem (≈30s)

**On screen:** Title card OR the deployed URL paused at the start state (single 1/2 block, Pip's greeting).

**What you say (one take, conversational):**

> "Synthesis Tutor's magic is that math feels like exploration, not homework. The challenge this week: build a one-lesson clone that captures that feeling. I made **Fraction Sponge** — a single web lesson that teaches 9-year-olds that 1/2 equals 2/4, by letting them split it apart and smash it back together."

**Beat:** Don't read the PRD. One sentence on problem, one on what you built.

---

## 0:30–2:00 — Play the lesson as a kid would (≈90s)

**On screen:** the live app. Don't narrate every click — let Pip and the manipulative carry it.

1. **0:30** — Pip greets: *"Hey! I'm Pip 🧽 I've got one half. I wonder what's hiding inside it…"*
2. **0:38** — Tap **Split it!** → chime, pieces slide apart. Pip: *"Whoa, two pieces! Each one is one-fourth…"*
3. **0:50** — Tap **Smash them!** → shake → flash → merge → equation `1/2 = 2/4` appears. Pip: *"They fit back PERFECTLY!"*

   *(Briefly say out loud:* "That's the aha moment — Pip names what their hands already felt."*)*

4. **1:05** — Tap **Let's check what you got!** → first check question appears.
5. **1:10–1:55** — Walk through Q1 → Q2 → Q3 quickly, getting them right.

**What you can say over this segment:**

> "The lesson has three phases — explore, instruct, check. Explore comes first; Pip names the concept *after* the kid has physically done it; the check is what locks it in."

---

## 2:00–3:00 — The Claude moment: a wrong answer (≈60s)

This is the moment that shows judges this is an *AI*-powered tutor, not just a scripted dialogue tree.

1. **2:00** — At Q4 (or whichever next), deliberately tap a **wrong** answer.
2. **2:05** — Typing indicator appears.
3. **2:08** — Pip's hint arrives. *Read it aloud* — "watch how Pip never says 'wrong' — she points back to what they just did with the pieces."
4. **2:20** — Tap the same wrong answer *again*.
5. **2:24** — Two new bubbles: another hint + a rephrased version of the question.
6. **2:35** — Pick the right answer. Pip cheers.

**What you can say:**

> "Wrong answers go to a Claude `haiku-4-5` endpoint. The system prompt enforces Pip's voice — never says 'wrong,' always references the physical blocks. On a second wrong attempt, Pip also rephrases the question. The happy path is fully scripted, so it works even if Claude is offline."

---

## 3:00–3:45 — Finish and celebrate (≈45s)

1. **3:00** — Speed through the remaining questions correctly.
2. **3:30** — Q7 correct → confetti + win message + Pip's wrap-up line.
3. **3:40** — Tap **Play Again!** to show the reset works cleanly.

---

## 3:45–4:30 — iPad story (≈45s)

**On screen:** Show the live app **on the actual iPad** (or Chrome DevTools iPad mode).

**What you say:**

> "Designed iPad-first. Touch targets are all 60px or larger, pinch-zoom is locked, the audio context unlocks on first tap so iOS Safari plays sound. Rotate to portrait — the layout stacks. Rotate back — side-by-side. No accounts, no install, just a URL."

**Show:** rotate the iPad once, then back.

---

## 4:30–5:00 — Architecture in 30 seconds (≈30s)

**On screen:** Switch to `architecture.svg` or sketch a quick diagram.

**What you say:**

> "Architecture: vanilla HTML/CSS/JS on the front, Node + Express on the back. The manipulative emits events, a state machine in `tutorScript.js` listens, and one endpoint — `POST /api/tutor` — proxies wrong answers to Claude with the API key kept on the server. Deployed on Railway. That's it."

**Close on the deployed URL.**

---

## What NOT to do

- Don't explain every animation. Let them play.
- Don't apologize for anything. If something glitches mid-take, restart that segment.
- Don't read code on camera. The architecture sentence + one screen of the diagram is enough.
- Don't go over 5 minutes. Tighten the wrong-answer segment first if you need to cut.

---

## Recovery plan if something goes wrong

| Problem | Fix |
|---|---|
| Claude API timeout mid-demo | The 8s timeout falls back to scripted hints — narrate it: "and this works offline too" |
| Audio doesn't play | First tap is the unlock — re-tap Split if silent |
| iPad freezes | Switch to Chrome DevTools iPad simulation and finish the take there |
| You stumble on a line | Stop, take a breath, restart the section. Loom lets you trim |

---

## Upload + share

- Loom (unlisted) → easiest, link works immediately
- YouTube (unlisted) → larger file, archives well
- Put the link in the README under a `## Demo` section before submitting
