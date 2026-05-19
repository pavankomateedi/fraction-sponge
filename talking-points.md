# Demo Talking Points

A pocket-sized cheat-sheet for the recording. The full beat-by-beat script is in [demo-script.md](demo-script.md) — this is just the lines you should *nail* and the moments you shouldn't miss.

Print this or pin it next to your screen. Don't read it on camera.

---

## The one-sentence pitch

> "Synthesis Tutor's magic is that math feels like exploration, not homework. I built **Fraction Sponge** — a one-lesson web tutor that teaches 9-year-olds that 1/2 equals 2/4, by letting them split it apart and smash it back together."

That sentence does three jobs: names the inspiration, names the lesson, names the gesture. Open with it.

---

## The five lines that have to land

| When | Line |
|---|---|
| Right after smash + equation appears | *"That's the aha moment — Pip names what their hands already felt."* |
| Just before the wrong-answer demo | *"Watch how Pip never says 'wrong' — she points back to what the kid just did with the pieces."* |
| After Pip's hint arrives | *"That came from a Claude `haiku-4-5` call. The system prompt enforces Pip's voice — never 'wrong,' always references the physical blocks."* |
| Showing the iPad | *"60px touch targets, pinch-zoom locked, audio context unlocks on first tap. iPad-first, no install, no login."* |
| At the architecture diagram | *"One endpoint — `POST /api/tutor` — proxies wrong answers to Claude. API key stays on the server. The happy path is fully scripted, so it works offline."* |

If you can only deliver one of these, deliver line 2.

---

## Words to use

These are the words that prove you thought about it like a teacher, not just a coder:

- **"Aha moment"** — the smash + equation reveal
- **"Discovery, not instruction"** — what differentiates Synthesis from a worksheet
- **"Pip names the concept *after* the kid has felt it"** — your pedagogical insight
- **"Redirect, never correct"** — Pip's voice principle
- **"Same size, different name"** — the kid-language for equivalence
- **"Touch-first, no keyboard assumed"** — the iPad design constraint
- **"Scripted happy path, Claude for the wrong-answer branch"** — your AI scope decision

---

## Words to AVOID

- "Just" (as in "I just used Express") — sells your work short
- "Simple" / "basic" — same problem
- "It mostly works" — say what works
- "I didn't have time to" — they don't need to know
- "Honestly" — filler that signals you weren't being honest before
- Any technical jargon a 9-year-old's parent wouldn't understand, *unless* you're in the 30-sec architecture segment

---

## The Q&A you should expect

If anyone asks live questions, here are the four most likely:

**Q: Why scripted dialogue + Claude for hints, instead of full LLM?**
> Three reasons: (1) the happy path needs to be fast and predictable — a 9-year-old won't wait, (2) Claude is the *recovery* path, where pedagogical nuance matters most, (3) it works offline if the API is down — the scripted fallback covers every hint.

**Q: How do you know Pip's responses are good?**
> There's an eval suite in `evals/`. 20 hand-curated cases × 7 deterministic rules (no banned words, references the manipulative, asks a question, etc.) + optional LLM-as-judge for warmth and pedagogy. Production currently passes 100% of rule checks. I can re-run it against the live URL anytime with `npm run eval:live`.

**Q: What would you build next?**
> Two threads. Pedagogically: a second equivalent-fraction lesson (thirds + sixths) to test whether the manipulative idiom generalizes. Technically: stratified eval cases drawn from real student error frequencies, plus a regression-diff hook that catches Pip's persona drifting over model upgrades.

**Q: How did you build it so fast?**
> Single concept, single screen, no accounts, no DB. Constraint-driven. The hard part was the *lesson design* — getting the split-and-smash gesture to be the assessment, not a separate quiz. The code itself is ~1000 lines.

---

## Common stumbles (and the recovery line for each)

| If this happens | Say |
|---|---|
| You stumble naming the model | "It's Claude Haiku — the fast, cheap one. Right tool for a real-time kid tutor." |
| You can't remember a Pip line | Read the next bubble off the screen — it's *supposed* to carry the demo |
| The smash animation feels slow on camera | "And the smash takes about half a second — long enough to feel satisfying, short enough that a 9-year-old doesn't get bored" |
| iPad audio doesn't fire on first tap | Re-tap Split. iOS unlocks the audio context on user gesture — that's by design |
| Claude API is slow mid-demo | "And here's the 8-second timeout falling through to the scripted hint — works offline too" |

---

## Pre-recording checklist (30 seconds)

Run this in your terminal **right before hitting record**:

```bash
npm run preflight
```

You want **READY TO DEMO** in green. If not — abort, fix, retry.

Also:
- [ ] iPad on WiFi, charged, plugged in
- [ ] URL bookmarked on iPad's home screen
- [ ] Browser tab on desktop: live URL
- [ ] Browser tab on desktop: architecture.svg (for the 30-sec arch close)
- [ ] Slack / email / phone notifications OFF
- [ ] Mic gain reasonable (test one sentence first)
- [ ] One bottle of water in arm's reach

---

## After recording

- Cut anything over 4:30 — leave a 30-sec buffer for the upload preview
- Upload to **Loom (unlisted)** — instant link, plays anywhere
- Add the link to README under `## Demo` (right under the live URL line)
- Push it: `git push` — done.
