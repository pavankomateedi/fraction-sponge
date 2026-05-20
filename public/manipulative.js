/* ─────────────────────────────────────────
   manipulative.js — fruit workspace
   Renders apple cross-sections (whole, half,
   quarter) that the kid can split and squish
   to discover 1/2 = 2/4.

   Pure visual + audio module. Knows nothing
   about Pip, the tutor, or the lesson script.
   Emits `pieceAction` events on window so
   the tutor can subscribe.
   ───────────────────────────────────────── */
(function () {
  'use strict';

  // ── Web Audio (synthesised, no files) ──
  let _audioCtx;
  function ac() {
    if (!_audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      _audioCtx = new Ctx();
    }
    // iOS Safari: context may start suspended; we resume on first user gesture.
    if (_audioCtx.state === 'suspended') _audioCtx.resume().catch(() => {});
    return _audioCtx;
  }

  function tone(freq, type, dur, vol = 0.28, t0 = 0) {
    try {
      const ctx = ac();
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + t0);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.82, ctx.currentTime + t0 + dur);
      g.gain.setValueAtTime(0, ctx.currentTime + t0);
      g.gain.linearRampToValueAtTime(vol, ctx.currentTime + t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t0 + dur);
      osc.start(ctx.currentTime + t0);
      osc.stop(ctx.currentTime + t0 + dur + 0.05);
    } catch (_) { /* audio is non-critical */ }
  }

  const sounds = {
    split: () => {
      // "Slice!" — bright rising chime, like a knife through fruit
      tone(700,  'sine', 0.10, 0.24, 0);
      tone(1050, 'sine', 0.09, 0.20, 0.06);
      tone(1400, 'sine', 0.08, 0.16, 0.12);
    },
    smash: () => {
      // "Squish!" — soft thud with a juicy resolution
      tone(160, 'sawtooth', 0.10, 0.30, 0);
      tone(120, 'sawtooth', 0.14, 0.26, 0.05);
      tone(480, 'sine',     0.10, 0.22, 0.17);
    },
    win: () => {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 'sine', 0.32, 0.24, i * 0.11));
    },
    // Equation reveal — three-note C-major chord stacking, resolving.
    // Plays when `1/2 = 2/4` slides into view. This IS the "math has changed"
    // musical accent.
    equation: () => {
      tone(523, 'sine', 0.45, 0.20, 0);     // C5
      tone(659, 'sine', 0.45, 0.20, 0.06);  // E5
      tone(784, 'sine', 0.55, 0.22, 0.12);  // G5 — resolution
    },
    // Correct answer — soft positive two-note ascending "ding"
    correct: () => {
      tone(880,  'sine', 0.09, 0.18, 0);     // A5
      tone(1175, 'sine', 0.12, 0.18, 0.07);  // D6
    },
    // Wrong answer — warm low-mid tone with slight downward drop.
    // Triangle wave for warmth; never punitive, just a "try-again" cue.
    wrong: () => {
      tone(330, 'triangle', 0.18, 0.14, 0);
      tone(247, 'triangle', 0.22, 0.12, 0.10);
    },
    // Fruit transition — quick upward sweep marking a new fruit chapter
    transition: () => {
      tone(523, 'sine', 0.07, 0.14, 0);     // C5
      tone(659, 'sine', 0.07, 0.14, 0.05);  // E5
      tone(880, 'sine', 0.09, 0.16, 0.10);  // A5
    },
    // Button tap — very short, very quiet UI click
    tap: () => {
      tone(1500, 'sine', 0.025, 0.08, 0);
    },
  };

  // Hook for future captions / sound-indicator layer: every named
  // sound dispatches a 'soundPlayed' event so visual badges, ARIA
  // live regions, or screen-reader announcements can latch onto it
  // without touching the audio code.
  function playSound(name) {
    const fn = sounds[name];
    if (typeof fn !== 'function') return;
    fn();
    try {
      window.dispatchEvent(new CustomEvent('soundPlayed', { detail: { name } }));
    } catch (_) { /* event dispatch is non-critical */ }
  }

  // ── Fruit cross-section builders ──
  // The half / quarter manipulative pieces are cross-section shapes that
  // read as different round fruits just by swapping the color scheme:
  //   apple      — red skin, cream flesh, brown seeds, green leaf
  //   orange     — orange skin, pale flesh, no leaf
  //   watermelon — green rind, pink flesh, black seeds, no leaf
  // Each lesson picks one (set via setFruit) so the three lessons don't
  // all start with an apple.
  const FRUIT_SKIN = {
    apple:      { s0: '#ef5350', s1: '#c62828', s2: '#7f0000', flesh: '#FFF8E1', core: '#fde6c8', seed: '#3e2723', leaf: '#66bb6a', label: '#8d1414' },
    orange:     { s0: '#FFB74D', s1: '#FB8C00', s2: '#E65100', flesh: '#FFF3E0', core: '#FFE0B2', seed: '#C04C00', leaf: null,      label: '#8d4a00' },
    watermelon: { s0: '#66BB6A', s1: '#388E3C', s2: '#1B5E20', flesh: '#FF6F8E', core: '#FF8FA3', seed: '#2b1a0e', leaf: null,      label: '#B71C3A' },
  };
  let manipFruit = 'apple';
  function setFruit(f) { if (FRUIT_SKIN[f]) manipFruit = f; }
  function skin() { return FRUIT_SKIN[manipFruit] || FRUIT_SKIN.apple; }

  function appleHalfSVG() {
    // Half cross-section: curved skin on top, flat cut face on bottom.
    // viewBox 240×130 to match landscape block sizing.
    const k = skin();
    const id = `skinHalf_${manipFruit}`;
    const leaf = k.leaf
      ? `<ellipse cx="138" cy="14" rx="14" ry="6" fill="${k.leaf}" transform="rotate(20 138 14)"/>`
      : '';
    return `
<svg viewBox="0 0 240 130" xmlns="http://www.w3.org/2000/svg" class="fruit-svg fruit-half" aria-hidden="true">
  <defs>
    <linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${k.s0}"/>
      <stop offset="60%" stop-color="${k.s1}"/>
      <stop offset="100%" stop-color="${k.s2}"/>
    </linearGradient>
  </defs>
  <rect x="116" y="6" width="8" height="14" rx="3" fill="#5d4037"/>
  ${leaf}
  <path d="M 20 115 Q 20 25 120 25 Q 220 25 220 115 Z"
        fill="${k.flesh}" stroke="url(#${id})" stroke-width="10" stroke-linejoin="round"/>
  <path d="M 120 38 Q 102 75 120 110 Q 138 75 120 38 Z" fill="${k.core}" opacity="0.7"/>
  <ellipse cx="105" cy="70" rx="4.5" ry="6" fill="${k.seed}" transform="rotate(-25 105 70)"/>
  <ellipse cx="135" cy="70" rx="4.5" ry="6" fill="${k.seed}" transform="rotate(25 135 70)"/>
  <ellipse cx="120" cy="92" rx="4.5" ry="6" fill="${k.seed}"/>
</svg>`;
  }

  // ── Watermelon SVG (Q3-Q4: 3/6 = 1/2) ─────────────────────────
  // Top-down round watermelon slice, 6 wedges. Left half (3 wedges)
  // highlighted in deeper red so "3/6" reads as "the dark-red half".
  // Green rind ring, pink/red flesh, dark seeds.
  function watermelonSVG() {
    return `
<svg viewBox="0 0 240 160" xmlns="http://www.w3.org/2000/svg" class="fruit-svg fruit-watermelon" aria-hidden="true">
  <defs>
    <radialGradient id="melonFlesh" cx="50%" cy="42%">
      <stop offset="0%" stop-color="#FF6F8E"/>
      <stop offset="100%" stop-color="#E63956"/>
    </radialGradient>
    <radialGradient id="melonFleshHi" cx="50%" cy="42%">
      <stop offset="0%" stop-color="#E63956"/>
      <stop offset="100%" stop-color="#B71C3A"/>
    </radialGradient>
  </defs>
  <g transform="translate(120,80)">
    <!-- Dark green rind -->
    <circle r="70" fill="#2E7D32"/>
    <!-- Light green inner rind -->
    <circle r="64" fill="#A5D66A"/>
    <!-- Flesh -->
    <circle r="58" fill="url(#melonFlesh)"/>
    <!-- Left half: deeper red highlight (3/6 = 1/2) -->
    <path d="M 0 -58 A 58 58 0 0 0 0 58 L 0 0 Z" fill="url(#melonFleshHi)"/>
    <!-- Wedge dividers (6 wedges) -->
    <g stroke="rgba(255,255,255,0.55)" stroke-width="2" stroke-linecap="round">
      <line x1="0" y1="0" x2="0"   y2="-58"/>
      <line x1="0" y1="0" x2="50"  y2="-29"/>
      <line x1="0" y1="0" x2="50"  y2="29"/>
      <line x1="0" y1="0" x2="0"   y2="58"/>
      <line x1="0" y1="0" x2="-50" y2="29"/>
      <line x1="0" y1="0" x2="-50" y2="-29"/>
    </g>
    <!-- Seeds scattered in the flesh -->
    <g fill="#2b1a0e">
      <ellipse cx="-28" cy="-18" rx="3" ry="5" transform="rotate(20 -28 -18)"/>
      <ellipse cx="-20" cy="22"  rx="3" ry="5" transform="rotate(-15 -20 22)"/>
      <ellipse cx="-38" cy="6"   rx="3" ry="5" transform="rotate(10 -38 6)"/>
      <ellipse cx="26"  cy="-22" rx="3" ry="5" transform="rotate(-20 26 -22)"/>
      <ellipse cx="34"  cy="14"  rx="3" ry="5" transform="rotate(15 34 14)"/>
      <ellipse cx="18"  cy="32"  rx="3" ry="5" transform="rotate(-10 18 32)"/>
    </g>
  </g>
  <!-- Side labels -->
  <g font-family="Nunito, sans-serif" font-weight="900" text-anchor="middle">
    <text x="80"  y="150" font-size="14" fill="#B71C3A">3/6</text>
    <text x="160" y="150" font-size="14" fill="#2E7D32">3/6</text>
  </g>
</svg>`;
  }

  // ── Banana SVG (Q5: 1/3 = 2/6) ─────────────────────────────────
  // Two stacked banana cross-sections — top split into 3 chunks
  // (one highlighted), bottom split into 6 (two highlighted). The
  // two highlight bands are the same width so the kid sees 1/3 = 2/6.
  function bananaSVG() {
    return `
<svg viewBox="0 0 240 160" xmlns="http://www.w3.org/2000/svg" class="fruit-svg fruit-banana" aria-hidden="true">
  <defs>
    <linearGradient id="bananaSkin" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFEB3B"/>
      <stop offset="100%" stop-color="#E6A700"/>
    </linearGradient>
    <linearGradient id="bananaHi" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFC107"/>
      <stop offset="100%" stop-color="#FF8F00"/>
    </linearGradient>
  </defs>
  <!-- Top banana: 3 chunks, leftmost highlighted (1/3) -->
  <g transform="translate(20,28)">
    <rect x="0"  y="0" width="60" height="36" rx="14" fill="url(#bananaHi)" stroke="#7A5A0E" stroke-width="2"/>
    <rect x="65" y="0" width="60" height="36" rx="14" fill="url(#bananaSkin)" stroke="#7A5A0E" stroke-width="2"/>
    <rect x="130" y="0" width="60" height="36" rx="14" fill="url(#bananaSkin)" stroke="#7A5A0E" stroke-width="2"/>
    <text x="-12" y="22" font-family="Nunito,sans-serif" font-weight="900" font-size="13" fill="#8d4a00">1/3</text>
  </g>
  <!-- Bottom banana: 6 chunks, leftmost TWO highlighted (2/6) -->
  <g transform="translate(20,92)">
    <rect x="0"  y="0" width="28" height="36" rx="10" fill="url(#bananaHi)" stroke="#7A5A0E" stroke-width="2"/>
    <rect x="32" y="0" width="28" height="36" rx="10" fill="url(#bananaHi)" stroke="#7A5A0E" stroke-width="2"/>
    <rect x="64" y="0" width="28" height="36" rx="10" fill="url(#bananaSkin)" stroke="#7A5A0E" stroke-width="2"/>
    <rect x="96" y="0" width="28" height="36" rx="10" fill="url(#bananaSkin)" stroke="#7A5A0E" stroke-width="2"/>
    <rect x="128" y="0" width="28" height="36" rx="10" fill="url(#bananaSkin)" stroke="#7A5A0E" stroke-width="2"/>
    <rect x="160" y="0" width="28" height="36" rx="10" fill="url(#bananaSkin)" stroke="#7A5A0E" stroke-width="2"/>
    <text x="-12" y="22" font-family="Nunito,sans-serif" font-weight="900" font-size="13" fill="#8d4a00">2/6</text>
  </g>
  <!-- Vertical alignment guide showing the highlighted portions are equal -->
  <line x1="80" y1="20" x2="80" y2="140" stroke="#8d4a00" stroke-width="1.5" stroke-dasharray="3,3" opacity="0.5"/>
</svg>`;
  }

  // ── Orange SVG (Q7: 4/8 = 1/2) ─────────────────────────────────
  // Top-down cross-section, 8 natural segments, 4 highlighted in
  // deeper tangerine showing 4/8 = half the orange.
  function orangeSVG() {
    return `
<svg viewBox="0 0 240 160" xmlns="http://www.w3.org/2000/svg" class="fruit-svg fruit-orange" aria-hidden="true">
  <defs>
    <radialGradient id="orangePeel" cx="50%" cy="40%">
      <stop offset="0%" stop-color="#FFB74D"/>
      <stop offset="100%" stop-color="#E65100"/>
    </radialGradient>
    <radialGradient id="orangeHi" cx="50%" cy="40%">
      <stop offset="0%" stop-color="#FF9800"/>
      <stop offset="100%" stop-color="#BF360C"/>
    </radialGradient>
  </defs>
  <g transform="translate(120,80)">
    <!-- Outer peel ring -->
    <circle r="70" fill="#FFE0B2" stroke="#C04C00" stroke-width="4"/>
    <!-- 8 segments via paths (each 45°) -->
    <!-- Left half: HIGHLIGHTED segments (4/8) -->
    <path d="M 0 0 L 0 -65 A 65 65 0 0 0 -46 -46 Z" fill="url(#orangeHi)"/>
    <path d="M 0 0 L -46 -46 A 65 65 0 0 0 -65 0 Z" fill="url(#orangeHi)"/>
    <path d="M 0 0 L -65 0 A 65 65 0 0 0 -46 46 Z" fill="url(#orangeHi)"/>
    <path d="M 0 0 L -46 46 A 65 65 0 0 0 0 65 Z" fill="url(#orangeHi)"/>
    <!-- Right half: regular peel color (the other 4/8) -->
    <path d="M 0 0 L 0 65 A 65 65 0 0 0 46 46 Z" fill="url(#orangePeel)"/>
    <path d="M 0 0 L 46 46 A 65 65 0 0 0 65 0 Z" fill="url(#orangePeel)"/>
    <path d="M 0 0 L 65 0 A 65 65 0 0 0 46 -46 Z" fill="url(#orangePeel)"/>
    <path d="M 0 0 L 46 -46 A 65 65 0 0 0 0 -65 Z" fill="url(#orangePeel)"/>
    <!-- Segment dividers (white membrane) -->
    <g stroke="white" stroke-width="2.5" stroke-linecap="round">
      <line x1="0" y1="0" x2="0"   y2="-65"/>
      <line x1="0" y1="0" x2="46"  y2="-46"/>
      <line x1="0" y1="0" x2="65"  y2="0"/>
      <line x1="0" y1="0" x2="46"  y2="46"/>
      <line x1="0" y1="0" x2="0"   y2="65"/>
      <line x1="0" y1="0" x2="-46" y2="46"/>
      <line x1="0" y1="0" x2="-65" y2="0"/>
      <line x1="0" y1="0" x2="-46" y2="-46"/>
    </g>
    <!-- Center pith -->
    <circle r="6" fill="white" stroke="#C04C00" stroke-width="1.5"/>
  </g>
  <g font-family="Nunito, sans-serif" font-weight="900" text-anchor="middle">
    <text x="80"  y="148" font-size="14" fill="#8d4a00">4/8</text>
    <text x="160" y="148" font-size="14" fill="#7A4A20">4/8</text>
  </g>
</svg>`;
  }

  // ── Apple + Banana side-by-side (Q6: 1/2 ≠ 1/3) ────────────────
  // The discriminate question — visually proves 1/2 apple is bigger
  // than 1/3 banana.
  function appleBananaCompareSVG() {
    return `
<svg viewBox="0 0 280 160" xmlns="http://www.w3.org/2000/svg" class="fruit-svg fruit-compare" aria-hidden="true">
  <defs>
    <linearGradient id="cmpAppleSkin" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ef5350"/>
      <stop offset="100%" stop-color="#c62828"/>
    </linearGradient>
    <linearGradient id="cmpBanana" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFC107"/>
      <stop offset="100%" stop-color="#FF8F00"/>
    </linearGradient>
  </defs>
  <!-- LEFT: half-apple, taller -->
  <g transform="translate(10,20)">
    <rect x="55" y="6" width="6" height="10" rx="2" fill="#5d4037"/>
    <ellipse cx="70" cy="14" rx="9" ry="4" fill="#66bb6a" transform="rotate(22 70 14)"/>
    <path d="M 58 22 Q 18 22 14 60 Q 12 110 58 120 Z"
          fill="#FFF8E1" stroke="url(#cmpAppleSkin)" stroke-width="7" stroke-linejoin="round"/>
    <ellipse cx="36" cy="62" rx="3" ry="4" fill="#3e2723"/>
    <ellipse cx="36" cy="86" rx="3" ry="4" fill="#3e2723"/>
    <text x="36" y="138" font-family="Nunito,sans-serif" font-weight="900" font-size="14" fill="#8d1414" text-anchor="middle">1/2 🍎</text>
  </g>
  <!-- DIVIDER + "vs" -->
  <g transform="translate(140,80)" font-family="Nunito,sans-serif" font-weight="900">
    <line x1="0" y1="-50" x2="0" y2="50" stroke="#5a3fc0" stroke-width="2" stroke-dasharray="4,4"/>
    <circle r="16" fill="#5a3fc0"/>
    <text y="6" font-size="13" fill="white" text-anchor="middle">vs</text>
  </g>
  <!-- RIGHT: third-of-banana, SHORTER chunk -->
  <g transform="translate(180,38)">
    <rect x="0" y="44" width="42" height="42" rx="14" fill="url(#cmpBanana)" stroke="#7A5A0E" stroke-width="2"/>
    <text x="21" y="120" font-family="Nunito,sans-serif" font-weight="900" font-size="14" fill="#8d4a00" text-anchor="middle">1/3 🍌</text>
    <!-- Show the third is smaller -->
  </g>
  <!-- Helper labels showing they're different sizes -->
  <g font-family="Nunito,sans-serif" font-weight="800" font-size="10" fill="#5a3fc0">
    <text x="140" y="20" text-anchor="middle">are these the SAME?</text>
  </g>
</svg>`;
  }

  function appleQuarterSVG(variant) {
    // Quarter = 90° wedge of cross-section, colored by the lesson fruit.
    const k = skin();
    const isLeft = variant === 'a';
    const skinId = `skinQ_${manipFruit}_${variant}`;
    const stemX = isLeft ? 128 : 4;
    const leafX = isLeft ? 116 : 16;
    const leafR = isLeft ? -30 : 30;
    const wedge = isLeft
      ? `M 130 115 L 10 115 A 130 130 0 0 1 130 25 Z`
      : `M 10 115 A 130 130 0 0 1 130 115 L 130 115 L 130 115 L 10 115 Z`;
    const wedgeRight = `M 10 115 L 10 25 A 130 130 0 0 1 130 115 Z`;
    const leaf = k.leaf
      ? `<ellipse cx="${leafX}" cy="14" rx="10" ry="4" fill="${k.leaf}" transform="rotate(${leafR} ${leafX} 14)"/>`
      : '';
    return `
<svg viewBox="0 0 140 130" xmlns="http://www.w3.org/2000/svg" class="fruit-svg fruit-quarter fruit-quarter-${variant}" aria-hidden="true">
  <defs>
    <linearGradient id="${skinId}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${k.s0}"/>
      <stop offset="60%" stop-color="${k.s1}"/>
      <stop offset="100%" stop-color="${k.s2}"/>
    </linearGradient>
  </defs>
  <rect x="${stemX - 2}" y="6" width="6" height="12" rx="2" fill="#5d4037"/>
  ${leaf}
  <path d="${isLeft ? wedge : wedgeRight}"
        fill="${k.flesh}" stroke="url(#${skinId})" stroke-width="9" stroke-linejoin="round"/>
  ${isLeft
    ? `<ellipse cx="100" cy="92" rx="4" ry="5.5" fill="${k.seed}" transform="rotate(-30 100 92)"/>`
    : `<ellipse cx="40"  cy="92" rx="4" ry="5.5" fill="${k.seed}" transform="rotate(30 40 92)"/>`}
</svg>`;
  }

  // ── State ──
  // Visual states:
  //   'half' / 'quarters' / 'merged' — apple manipulative phase
  //   'watermelon' — watermelon visualization for Q3-Q4 (3/6 vs 1/2)
  //   'banana'   — banana 1/3 vs 2/6 stacked visualization for Q5
  //   'compare'  — apple-half vs banana-third for Q6 (1/2 ≠ 1/3)
  //   'orange'   — orange 4/8 = 1/2 segment visualization for Q7
  let visualState = 'half';

  // ── DOM ──
  const refBar       = document.getElementById('refBar');
  const piecesArea   = document.getElementById('piecesArea');
  const equation     = document.getElementById('equation');
  const winMsg       = document.getElementById('winMsg');
  const flashOverlay = document.getElementById('flashOverlay');
  const workspaceEl  = piecesArea ? piecesArea.closest('.workspace') : null;

  // ── Renderers ──
  function renderRefBar(mode) {
    // Reference bar adapts to the current fruit + question context.
    const BR  = 'border-right:2px solid rgba(255,255,255,0.35);';
    const BD  = 'border-right:2px dashed rgba(255,255,255,0.5);';

    // Explore-phase palette derives from the active lesson fruit, so the
    // reference bar matches the apple/orange/watermelon pieces on screen.
    const k = skin();
    const FRUIT_EMOJI = { apple: '🍎', orange: '🍊', watermelon: '🍉' };
    const emoji = FRUIT_EMOJI[manipFruit] || '🍎';
    const APPLE_DARK   = `background:linear-gradient(135deg,${k.s1},${k.s2});`;
    const APPLE_BRIGHT = `background:linear-gradient(135deg,${k.s0},${k.s1});`;
    // Watermelon palette (check-phase Q3-Q4 visualization)
    const MELON_RED    = 'background:linear-gradient(135deg,#E63956,#B71C3A);';
    const MELON_LITE   = 'background:linear-gradient(135deg,#FF6F8E,#E63956);';
    // Banana palette
    const BANANA_HI    = 'background:linear-gradient(135deg,#FFC107,#FF8F00);';
    const BANANA_LITE  = 'background:linear-gradient(135deg,#FFEB3B,#E6A700);';
    // Orange palette
    const ORANGE_HI    = 'background:linear-gradient(135deg,#FF9800,#BF360C);';
    const ORANGE_LITE  = 'background:linear-gradient(135deg,#FFB74D,#E65100);';

    if (mode === 'half') {
      refBar.innerHTML =
        `<div class="ref-seg" style="width:50%;${APPLE_BRIGHT}${BR}">1/2 ${emoji}</div>` +
        `<div class="ref-seg empty" style="width:50%;">1/2</div>`;
    } else if (mode === 'quarters') {
      refBar.innerHTML =
        `<div class="ref-seg" style="width:25%;${APPLE_DARK}${BR}">1/4</div>` +
        `<div class="ref-seg" style="width:25%;${APPLE_BRIGHT}${BR}">1/4</div>` +
        `<div class="ref-seg empty" style="width:50%;">1/2</div>`;
    } else if (mode === 'both') {
      refBar.innerHTML =
        `<div class="ref-seg" style="width:25%;${APPLE_DARK}${BR}">1/4</div>` +
        `<div class="ref-seg" style="width:25%;${APPLE_BRIGHT}${BD}">1/4</div>` +
        `<div class="ref-seg" style="width:50%;${APPLE_BRIGHT}border-left:2px dashed rgba(255,255,255,0.5);">= 1/2 ${emoji}</div>`;
    } else if (mode === 'watermelon') {
      // 6 sixths total — left 3 deep-red, right 3 lighter pink-red
      refBar.innerHTML =
        Array.from({ length: 3 }).map(() => `<div class="ref-seg" style="width:16.66%;${MELON_RED}${BR}">1/6</div>`).join('') +
        Array.from({ length: 3 }).map((_, i) => `<div class="ref-seg" style="width:16.66%;${MELON_LITE}${i === 2 ? '' : BR}">1/6</div>`).join('');
    } else if (mode === 'banana') {
      // Left 2 sixths highlighted = 2/6 = 1/3; right 4 sixths lighter
      refBar.innerHTML =
        Array.from({ length: 2 }).map(() => `<div class="ref-seg" style="width:16.66%;${BANANA_HI}${BR}">1/6</div>`).join('') +
        Array.from({ length: 4 }).map((_, i) => `<div class="ref-seg" style="width:16.66%;${BANANA_LITE}${i === 3 ? '' : BR}color:#7A5A0E">1/6</div>`).join('');
    } else if (mode === 'compare') {
      // Half-apple-red vs third-banana-yellow at proportional widths
      refBar.innerHTML =
        `<div class="ref-seg" style="width:50%;${APPLE_BRIGHT}${BR}">1/2 🍎</div>` +
        `<div class="ref-seg" style="width:33.33%;${BANANA_HI}${BR}">1/3 🍌</div>` +
        `<div class="ref-seg empty" style="width:16.66%;"></div>`;
    } else if (mode === 'orange') {
      // 4 eighths highlighted + 4 eighths lighter
      refBar.innerHTML =
        Array.from({ length: 4 }).map(() => `<div class="ref-seg" style="width:12.5%;${ORANGE_HI}${BR}">1/8</div>`).join('') +
        Array.from({ length: 4 }).map((_, i) => `<div class="ref-seg" style="width:12.5%;${ORANGE_LITE}${i === 3 ? '' : BR}color:#7A4A20">1/8</div>`).join('');
    } else if (mode === 'cmp-half-quarter') {
      // Comparing lesson: 1/2 (big red) vs 1/4 (smaller red) — proportional widths
      refBar.innerHTML =
        `<div class="ref-seg" style="width:50%;${APPLE_BRIGHT}${BR}">1/2</div>` +
        `<div class="ref-seg" style="width:25%;${APPLE_DARK}${BR}">1/4</div>` +
        `<div class="ref-seg empty" style="width:25%;"></div>`;
    } else if (mode === 'adding') {
      // Adding lesson: 4 quarters, left 2 highlighted = 2/4
      refBar.innerHTML =
        `<div class="ref-seg" style="width:25%;${APPLE_DARK}${BR}">1/4</div>` +
        `<div class="ref-seg" style="width:25%;${APPLE_BRIGHT}${BR}">1/4</div>` +
        `<div class="ref-seg empty" style="width:25%;${BR}">1/4</div>` +
        `<div class="ref-seg empty" style="width:25%;">1/4</div>`;
    }
  }

  function makeFruitBlock(kind, variant, extraAnim) {
    // kind: 'half' | 'quarter'
    // variant: for quarter, 'a' or 'b'
    const d = document.createElement('div');
    const cls = kind === 'half' ? 'half' : `quarter-${variant}`;
    d.className = `frac-block ${cls} ${extraAnim || ''}`.trim();
    d.innerHTML = kind === 'half' ? appleHalfSVG() : appleQuarterSVG(variant);
    // Fraction label overlay
    const label = document.createElement('div');
    label.className = 'frac-label';
    const [n, den] = kind === 'half' ? ['1', '2'] : ['1', '4'];
    label.innerHTML = `<span class="frac-num">${n}</span><div class="frac-bar-line"></div><span class="frac-den">${den}</span>`;
    d.appendChild(label);
    return d;
  }

  function clearPieces() {
    piecesArea.innerHTML = '';
  }

  function showHalf(animClass) {
    clearPieces();
    piecesArea.appendChild(makeFruitBlock('half', null, animClass));
  }

  function showQuarters() {
    clearPieces();
    piecesArea.appendChild(makeFruitBlock('quarter', 'a', 'anim-slide-l'));
    piecesArea.appendChild(makeFruitBlock('quarter', 'b', 'anim-slide-r'));
  }

  function emit(type, detail = {}) {
    window.dispatchEvent(new CustomEvent('pieceAction', { detail: { type, ...detail } }));
  }

  // ── Public API ──
  function reset() {
    visualState = 'half';
    equation.classList.remove('show');
    winMsg.classList.remove('show');
    clearConfetti();
    showHalf('anim-bounce');
    renderRefBar('half');
    emit('reset');
    return Promise.resolve();
  }

  function split() {
    if (visualState !== 'half') return Promise.resolve();
    playSound('split');
    visualState = 'quarters';
    showQuarters();
    renderRefBar('quarters');
    emit('split');
    return wait(420);
  }

  function smash() {
    if (visualState !== 'quarters') return Promise.resolve();

    return new Promise((resolve) => {
      // Step 1: shake the quarter pieces
      const pieces = piecesArea.querySelectorAll('.frac-block');
      pieces.forEach((p) => {
        p.classList.add('anim-shake');
        setTimeout(() => p.classList.remove('anim-shake'), 420);
      });

      // Step 2: after the shake, flash + merge
      setTimeout(() => {
        playSound('smash');
        flashOverlay.classList.add('anim-flash');
        setTimeout(() => flashOverlay.classList.remove('anim-flash'), 380);

        visualState = 'merged';
        showHalf('anim-smash anim-pulse');
        renderRefBar('both');

        // Reveal equation slightly after the merge animation begins,
        // and chord the moment the math appears — "the math is changing"
        // musical accent the user asked for.
        setTimeout(() => {
          equation.classList.add('show');
          playSound('equation');
        }, 320);

        emit('smash');
        setTimeout(resolve, 700);
      }, 280);
    });
  }

  function celebrate() {
    playSound('win');
    winMsg.classList.add('show');
    launchConfetti();
    emit('celebrate');
    return wait(600);
  }

  // ── Lesson setup (called when a lesson loads) ──
  // mode: 'half' (equivalence/comparing start) | 'addingStart' (two quarters)
  // fruit: 'apple' | 'orange' | 'watermelon' — recolors the pieces so the
  //        three lessons don't all start with an apple.
  function setup(mode, fruit) {
    if (fruit) setFruit(fruit);
    equation.classList.remove('show');
    winMsg.classList.remove('show');
    clearConfetti();
    if (mode === 'addingStart') {
      visualState = 'quarters';
      showQuarters();
      renderRefBar('adding');
    } else {
      visualState = 'half';
      showHalf('anim-bounce');
      renderRefBar('half');
    }
  }

  // ── Comparing lesson: half-apple (big) next to quarter-apple (small) ──
  function compareSizes() {
    playSound('split');
    clearPieces();
    equation.classList.remove('show');

    const half = makeFruitBlock('half', null, 'anim-slide-l');
    half.classList.add('cmp-big');
    const quarter = makeFruitBlock('quarter', 'a', 'anim-slide-r');
    quarter.classList.add('cmp-small');

    piecesArea.appendChild(half);
    piecesArea.appendChild(quarter);
    renderRefBar('cmp-half-quarter');
    visualState = 'compareSizes';
    setTimeout(() => playSound('equation'), 300);
    emit('compareSizes');
    return wait(450);
  }

  // ── Adding lesson: two quarters combine into 2/4 ──
  function addingCombine() {
    if (visualState !== 'quarters') {
      // Make sure we're showing two quarters first.
      showQuarters();
      visualState = 'quarters';
    }
    return new Promise((resolve) => {
      const pieces = piecesArea.querySelectorAll('.frac-block');
      pieces.forEach((p) => {
        p.classList.add('anim-shake');
        setTimeout(() => p.classList.remove('anim-shake'), 420);
      });
      setTimeout(() => {
        playSound('smash');
        flashOverlay.classList.add('anim-flash');
        setTimeout(() => flashOverlay.classList.remove('anim-flash'), 380);

        // Show the merged half-apple (which = 2/4) but with an ADDITION
        // caption instead of the equivalence equation.
        visualState = 'addingMerged';
        clearPieces();
        const merged = makeFruitBlock('half', null, 'anim-smash anim-pulse');
        // Override the fraction label to read 2/4 (it's still half the apple).
        const lbl = merged.querySelector('.frac-label');
        if (lbl) lbl.innerHTML = '<span class="frac-num">2</span><div class="frac-bar-line"></div><span class="frac-den">4</span>';
        piecesArea.appendChild(merged);
        renderRefBar('adding');

        setTimeout(() => playSound('equation'), 280);
        emit('addingCombine');
        setTimeout(resolve, 700);
      }, 280);
    });
  }

  // Swap the workspace to a different fruit visual.
  // Used by app.js when the check phase moves from one fruit to another.
  // `key` ∈ { 'apple', 'watermelon', 'banana', 'compare', 'orange' }.
  function showFruit(key) {
    if (!piecesArea) return;
    // Hide the apple's smash-equation overlay — only relevant during the
    // apple manipulative phase.
    equation.classList.remove('show');

    if (key === 'apple') {
      // Restore the post-smash "both" view: half + 2 quarters + equation.
      clearPieces();
      const q1 = makeFruitBlock('quarter', 'a', 'anim-slide-l');
      const q2 = makeFruitBlock('quarter', 'b', 'anim-slide-r');
      piecesArea.appendChild(q1);
      piecesArea.appendChild(q2);
      renderRefBar('both');
      setTimeout(() => equation.classList.add('show'), 250);
      visualState = 'apple';
      emit('fruitChange', { key });
      return;
    }

    let svg = '';
    if (key === 'watermelon') svg = watermelonSVG();
    if (key === 'banana')     svg = bananaSVG();
    if (key === 'orange')     svg = orangeSVG();
    if (key === 'compare')    svg = appleBananaCompareSVG();
    if (!svg) return;

    clearPieces();
    const wrap = document.createElement('div');
    wrap.className = `frac-block fruit-${key} anim-bounce`;
    wrap.innerHTML = svg;
    piecesArea.appendChild(wrap);
    renderRefBar(key);
    visualState = key;
    emit('fruitChange', { key });
  }

  // ── Per-question fraction bars (lessons 2 & 3 check phase) ──
  // Renders fraction strips so the right side flows with each question.
  // All bars share the same total width, so 1/2 visibly fills more than
  // 1/4 (comparing), and addends + result read left-to-right (adding).
  // Uses the active lesson fruit's color for filled cells.
  function fractionBarHTML(frac) {
    const parts = String(frac).split('/');
    const n = parseInt(parts[0], 10) || 0;
    const d = parseInt(parts[1], 10) || 1;
    const k = skin();
    const fill = `background:linear-gradient(135deg,${k.s0},${k.s1});`;
    const cells = Array.from({ length: d }, (_, i) =>
      `<div class="vizcell${i < n ? ' fill' : ''}" style="${i < n ? fill : ''}"></div>`
    ).join('');
    return `<div class="vizrow"><span class="vizlabel">${frac}</span><div class="vizbar">${cells}</div></div>`;
  }

  function showFractionViz(spec) {
    if (!spec || !piecesArea) return;
    equation.classList.remove('show');
    let html = '';
    if (spec.type === 'compare') {
      html = (spec.fractions || []).map(fractionBarHTML).join('');
    } else if (spec.type === 'add') {
      const addends = (spec.fractions || []).map(fractionBarHTML).join('<div class="vizop">+</div>');
      html = addends + (spec.result ? `<div class="vizop">=</div>${fractionBarHTML(spec.result)}` : '');
    }
    clearPieces();
    const wrap = document.createElement('div');
    wrap.className = 'viz anim-bounce';
    wrap.innerHTML = html;
    piecesArea.appendChild(wrap);
    visualState = 'viz';
    emit('fractionViz', { spec });
  }

  function showEquation() {
    equation.classList.add('show');
  }

  function hideEquationAndWin() {
    equation.classList.remove('show');
    winMsg.classList.remove('show');
  }

  // ── Confetti ──
  function launchConfetti() {
    if (!workspaceEl) return;
    // Fruit-themed confetti palette: apple red, banana yellow, orange, watermelon pink, leaf green
    const colors = ['#c62828', '#FFD600', '#FF9800', '#EC407A', '#43A047', '#FF6F00', '#fff'];

    for (let i = 0; i < 42; i++) {
      setTimeout(() => {
        const c = document.createElement('div');
        const sz = 7 + Math.random() * 11;
        const dur = 1.2 + Math.random() * 0.9;
        const del = Math.random() * 0.55;
        const isRound = Math.random() > 0.4;
        c.className = 'confetti-piece';
        c.style.cssText = `
          left: ${6 + Math.random() * 88}%;
          top: 8px;
          width: ${sz}px;
          height: ${isRound ? sz : sz * 0.55}px;
          background: ${colors[Math.floor(Math.random() * colors.length)]};
          border-radius: ${isRound ? '50%' : '2px'};
          animation: confettiFall ${dur}s ease-in ${del}s forwards;
        `;
        workspaceEl.appendChild(c);
        setTimeout(() => c.remove(), (dur + del + 0.3) * 1000);
      }, i * 38);
    }
  }

  function clearConfetti() {
    if (!workspaceEl) return;
    workspaceEl.querySelectorAll('.confetti-piece').forEach((c) => c.remove());
  }

  // ── Utilities ──
  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ── Audio unlock primer ──
  // Mobile browsers (and Chrome's autoplay policy) keep an AudioContext
  // 'suspended' until it's created/resumed inside a real user gesture.
  // The hub adds an extra screen before the first lesson button, so we
  // prime audio on the VERY FIRST interaction anywhere on the page —
  // pointerdown/touchstart/click — well before the kid taps Slice it.
  // Also nudges speechSynthesis awake (iOS needs a gesture-bound call).
  let _audioPrimed = false;
  function primeAudioUnlock() {
    if (_audioPrimed) return;
    _audioPrimed = true;
    try {
      const ctx = ac();
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
      // Silent 1-sample blip to fully open the output on iOS.
      const b = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = b;
      src.connect(ctx.destination);
      src.start(0);
    } catch (_) {}
    try {
      // Prime TTS within the gesture so later speak() calls aren't blocked.
      if (window.speechSynthesis) window.speechSynthesis.resume();
    } catch (_) {}
  }

  function attachUnlockOnce() {
    const handler = () => {
      primeAudioUnlock();
      ['pointerdown', 'touchstart', 'click', 'keydown'].forEach((ev) =>
        window.removeEventListener(ev, handler, true));
    };
    ['pointerdown', 'touchstart', 'click', 'keydown'].forEach((ev) =>
      window.addEventListener(ev, handler, true));
  }

  // ── Boot ──
  function init() {
    showHalf('anim-bounce');
    renderRefBar('half');
    attachUnlockOnce();
  }

  // Expose
  window.manipulative = {
    init,
    setup,
    setFruit,
    reset,
    split,
    smash,
    compareSizes,
    addingCombine,
    celebrate,
    showFruit,
    showFractionViz,
    showEquation,
    hideEquationAndWin,
    playSound,
    getState: () => visualState,
  };
})();
