# iPad Roadmap — Fraction Sponge

Notes on how the app is built for iPad, what was specifically designed for touch, and what to test on-device before the demo.

---

## 1. Touch targets

All interactive elements meet or exceed **60 × 60 px** (Apple HIG recommends 44pt, but kids on iPads slap at the screen — bigger is better).

| Element                                       | Size                                                                                | Where set                                                                                                          |
| --------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Answer-choice buttons (`.choice-btn`)         | full-width × ≥60px min-height                                                       | [public/style.css](public/style.css) — `.choice-btn { min-height: 60px; padding: 14px 18px; }`                     |
| Advance/Reset button (primary/green variants) | full-width × ~64px                                                                  | inherits `.choice-btn`, taller via padding                                                                         |
| CC captions toggle                            | 60×60                                                                               | `.captions-toggle` — separate from `.choice-btn` to fit a square header slot                                       |
| Apple-piece pieces (slice / squish)           | 240×145 (half), 140×145 (quarter) on landscape; 200×125 / 115×125 on portrait       | `.frac-block.half`, `.frac-block.quarter-a/b`                                                                      |

No interactive element relies on hover. The fraction blocks are visual-only (the kid drives interaction via the chat panel's buttons) — this keeps the tap surface predictable.

---

## 2. Gestures

We deliberately avoid clever multi-touch and stick to single-tap. Why: a 9-year-old learning fraction equivalence shouldn't also be learning a gesture vocabulary.

| Interaction                       | Mechanism                                       |
| --------------------------------- | ----------------------------------------------- |
| Slice the half-apple              | Tap **🔪 Slice it!** button                     |
| Squish the two quarter-pieces     | Tap **🤲 Squish them together!** button         |
| Move into the check questions     | Tap **Let's check what you got!** button        |
| Answer check questions            | Tap one of three answer-choice buttons          |
| Toggle sound captions             | Tap the **CC** button in the chat header        |
| Start over                        | Tap **🔄 Play Again!** at the win screen        |

**Pinch-zoom is disabled** (`maximum-scale=1.0, user-scalable=no` in the `<meta name="viewport">` tag) so accidental two-finger pinches don't break the layout. The `-webkit-tap-highlight-color: transparent` rule removes the grey flash iOS adds to taps; the buttons have their own active-state styling (translate down + reduced shadow) that's tighter and more intentional.

`touch-action: manipulation` on buttons disables the 300ms double-tap-to-zoom delay so taps feel instant.

---

## 3. Layout

The app uses a **CSS Grid** shell that flips orientation based on aspect ratio. Defined in [public/style.css](public/style.css) `.app { display: grid; grid-template-columns: 40fr 60fr; }`.

### Landscape (≥ 820 px wide and wider than tall)

```text
┌─────────────┬─────────────────────┐
│  CHAT       │  WORKSPACE          │
│  Pip 🍎  CC │                     │
│  bubbles    │  reference bar      │
│             │                     │
│  answer     │  apple pieces       │
│  choices    │                     │
└─────────────┴─────────────────────┘
   40%             60%
```

Primary target. Designed for **iPad landscape (1024×768)** and larger.

### Portrait / phone (max-aspect-ratio: 1/1 OR max-width: 820px)

```text
┌─────────────────────────┐
│  CHAT (compact)         │
│  Pip + answer choices   │
├─────────────────────────┤
│  WORKSPACE              │
│  pieces + reference bar │
└─────────────────────────┘
```

Stack: chat on top (1fr), workspace on bottom (1.4fr — slightly more room for the visual). Fraction blocks scale down (200×110 half, 110×110 quarters) to fit.

### Very short screens (max-height: 540px)

A third media query shrinks pieces further for **landscape phone** mode so nothing gets clipped.

---

## 4. iOS Safari specifics

| Issue                                          | Fix                                                                                                                                                       |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `100vh` includes the URL bar, causing scroll   | Set `height: 100dvh` with `100vh` fallback                                                                                                                |
| Audio context starts suspended                 | `manipulative.js` calls `audioCtx.resume()` inside the synth helper — fires on first user tap (**Slice it**), as required by iOS                          |
| Status bar look                                | `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">` + `viewport-fit=cover`                                                  |
| Browser theme color                            | `<meta name="theme-color" content="#5a3fc0">`                                                                                                             |
| Double-tap text zoom                           | `-webkit-text-size-adjust: 100%` on html/body                                                                                                             |

---

## 5. Accessibility

The app is designed to be usable by Deaf, hard-of-hearing, non-speaking, and motion-sensitive users in addition to the primary kid persona. Touch-only, text-first, sound-as-enhancement.

### Baseline requirements

- **Minimum font 16px** — body 1rem (16px); Pip bubbles 1rem; choice buttons 1.02rem.
- **Color contrast ≥ 4.5:1** — purple darkened from `#667eea` (3.6:1) to `#5a3fc0` (≥6:1); green darkened from `#11998e` to `#0d7e76` for the same reason. All white text on gradient buttons verified ≥ 4.5:1.
- **ARIA live regions** — `<div class="messages" aria-live="polite">` for Pip's chat; `<div id="winMsg" aria-live="assertive">` for the win state; `<div id="captions" aria-live="polite">` for sound captions.
- **`<main>` landmark** — the `.app` shell is wrapped in `<main role="main">` so screen-reader landmark navigation works.
- **Decorative imagery hidden** — `aria-hidden="true"` on apple SVGs, mascot emoji, and all visual-only flourishes.

### Deaf / hard-of-hearing support

- **Sound captions** — every sound effect surfaces as a floating badge: `✂️ slice!`, `🤲 squish!`, `✨ yes!`, `💭 hmm…`, `🌟 new fruit!`, `🎉 hooray!`. Hooked into the `soundPlayed` event the audio module dispatches.
- **CC toggle** — 60×60 button in the chat header. State persists in `localStorage` as `fraction-fruit-lab.captions`. Default: **on** — accessibility-first.
- **Sound is never the only signal** — splits animate, smashes flash, equations reveal, confetti shows. The lesson is fully playable on a muted device.

### Non-speaking support

- **Touch-only** — every action is a tap. No voice input, no microphone permission requested.
- **No spoken Pip lines** — Pip's dialogue is always text in the chat panel. No audio narration to caption.

### Motion-sensitive support

- **Reduced motion** — `@media (prefers-reduced-motion: reduce)` strips bouncy springs, shakes, and spinning confetti, replacing them with simple fades. Set in OS Accessibility settings (iOS: Settings → Accessibility → Motion).
- **No autoplay video, no flashing > 3Hz** — the smash flash is ~380ms one-time, well below seizure-risk thresholds.

### Screen-reader polish

- **Action buttons** — each has an explicit `aria-label` independent of the emoji-prefixed visible text (e.g., "Slice the half-apple into two quarters" rather than just "🔪 Slice it!").
- **Choice buttons** — each carries `aria-label="Answer N of 3: <text>"` and `aria-describedby` pointing at the question bubble, so screen-reader users get question + answer-position context.
- **Win announcement** — the `#winMsg` element is `aria-live="assertive"` so it interrupts and announces immediately on win.

### Forced-colors / high-contrast mode

`@media (forced-colors: active)` adds explicit borders to choice buttons, the CC toggle, and caption pills so the UI survives Windows High Contrast and similar OS-level accessibility modes.

---

## 6. On-device test checklist (run before recording the demo)

Open the deployed URL in **Safari on iPad** and walk through:

- [ ] App loads under 2 seconds on WiFi (NFR-1)
- [ ] Two-panel layout: chat is 40%, workspace 60% in landscape
- [ ] Rotate to portrait → layout stacks (chat on top, workspace below)
- [ ] Rotate back → returns cleanly to side-by-side
- [ ] First tap on **Split it!** starts audio (no silence — iOS audio unlock fired)
- [ ] Split animation: pieces slide apart with a chime
- [ ] **Smash them!** → pieces shake → flash → 1/2 reappears → equation slides in
- [ ] **Let's check** → first question appears in chat
- [ ] Tap a wrong answer → typing indicator → Pip's hint appears
- [ ] Tap wrong again → second hint AND a rephrased question appear
- [ ] Tap correct → cheer line → next question
- [ ] All 7 questions reachable; (n/7) progress indicator updates
- [ ] After Q7 correct → confetti + win message + Pip's wrap-up line
- [ ] **Play Again** → chat clears, workspace resets to single 1/2 block
- [ ] No vertical scroll on the page itself (chat scrolls *internally* if long)
- [ ] All buttons feel "tap-then-action" with no 300ms delay
- [ ] No iOS bounce/rubber-band scroll outside the chat panel
- [ ] Disable WiFi → submit a wrong answer → scripted fallback hint still works (NFR-2)

If any item fails: file under "post-demo polish" — don't block the demo on it.
