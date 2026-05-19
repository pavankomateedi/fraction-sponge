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

  // ── Apple SVG builders ──
  // Cross-section view of an apple: red rim (skin), pale interior (flesh),
  // dark seeds in the middle. Pieces are sized to fit the existing
  // .frac-block container so we don't have to rewire the CSS layout.

  function appleHalfSVG() {
    // Half-apple = top half of cross-section: curved skin on top, flat cut face on bottom.
    // viewBox 240×130 to match landscape block sizing.
    return `
<svg viewBox="0 0 240 130" xmlns="http://www.w3.org/2000/svg" class="fruit-svg fruit-half" aria-hidden="true">
  <defs>
    <linearGradient id="appleSkinHalf" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ef5350"/>
      <stop offset="60%" stop-color="#c62828"/>
      <stop offset="100%" stop-color="#7f0000"/>
    </linearGradient>
  </defs>
  <!-- Stem -->
  <rect x="116" y="6" width="8" height="14" rx="3" fill="#5d4037"/>
  <!-- Leaf -->
  <ellipse cx="138" cy="14" rx="14" ry="6" fill="#66bb6a" transform="rotate(20 138 14)"/>
  <!-- Apple body (flesh - white) -->
  <path d="M 20 115 Q 20 25 120 25 Q 220 25 220 115 Z"
        fill="#FFF8E1" stroke="url(#appleSkinHalf)" stroke-width="10" stroke-linejoin="round"/>
  <!-- Core silhouette (subtle) -->
  <path d="M 120 38 Q 102 75 120 110 Q 138 75 120 38 Z"
        fill="#fde6c8" opacity="0.7"/>
  <!-- Seeds: star pattern at the heart of the cut face -->
  <ellipse cx="105" cy="70" rx="4.5" ry="6" fill="#3e2723" transform="rotate(-25 105 70)"/>
  <ellipse cx="135" cy="70" rx="4.5" ry="6" fill="#3e2723" transform="rotate(25 135 70)"/>
  <ellipse cx="120" cy="92" rx="4.5" ry="6" fill="#3e2723"/>
</svg>`;
  }

  function appleQuarterSVG(variant) {
    // Quarter-apple = 90° wedge of cross-section.
    // variant 'a' = left-leaning, variant 'b' = right-leaning (mirror).
    // viewBox 140×130 to match landscape quarter block sizing.
    const isLeft = variant === 'a';
    const skinId = `appleSkinQ${variant}`;
    const stemX = isLeft ? 128 : 4;        // stem at outer (far) corner
    const leafX = isLeft ? 116 : 16;
    const leafR = isLeft ? -30 : 30;
    // Wedge path: tip at inner corner, curved arc on the outside.
    // Left variant: tip at bottom-right (130,115); arc goes up-left.
    // Right variant: tip at bottom-left (10,115); arc goes up-right.
    const wedge = isLeft
      ? `M 130 115 L 10 115 A 130 130 0 0 1 130 25 Z`     // curved top-left
      : `M 10 115 A 130 130 0 0 1 130 115 L 130 115 L 130 115 L 10 115 Z`;
    // Right wedge actually needs: tip at bottom-left, curved going up-right, back along right edge.
    const wedgeRight = `M 10 115 L 10 25 A 130 130 0 0 1 130 115 Z`;
    return `
<svg viewBox="0 0 140 130" xmlns="http://www.w3.org/2000/svg" class="fruit-svg fruit-quarter fruit-quarter-${variant}" aria-hidden="true">
  <defs>
    <linearGradient id="${skinId}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ef5350"/>
      <stop offset="60%" stop-color="#c62828"/>
      <stop offset="100%" stop-color="#7f0000"/>
    </linearGradient>
  </defs>
  ${isLeft ? `
  <!-- Stem at outer (right) corner -->
  <rect x="${stemX - 2}" y="6" width="6" height="12" rx="2" fill="#5d4037"/>
  <ellipse cx="${leafX}" cy="14" rx="10" ry="4" fill="#66bb6a" transform="rotate(${leafR} ${leafX} 14)"/>
  ` : `
  <!-- Stem at outer (left) corner -->
  <rect x="${stemX - 2}" y="6" width="6" height="12" rx="2" fill="#5d4037"/>
  <ellipse cx="${leafX}" cy="14" rx="10" ry="4" fill="#66bb6a" transform="rotate(${leafR} ${leafX} 14)"/>
  `}
  <!-- Wedge body -->
  <path d="${isLeft ? wedge : wedgeRight}"
        fill="#FFF8E1" stroke="url(#${skinId})" stroke-width="9" stroke-linejoin="round"/>
  <!-- Seed near inner corner -->
  ${isLeft
    ? `<ellipse cx="100" cy="92" rx="4" ry="5.5" fill="#3e2723" transform="rotate(-30 100 92)"/>`
    : `<ellipse cx="40"  cy="92" rx="4" ry="5.5" fill="#3e2723" transform="rotate(30 40 92)"/>`}
</svg>`;
  }

  // ── State ──
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
    // Reference bar shows the apple-skin red and the fraction proportions.
    // 'half'      — left half filled red, right half empty (the whole bar = a whole apple worth)
    // 'quarters'  — left quarter dark-red, next quarter bright-red, right half empty
    // 'both'      — combined view: the two quarters AND the half overlapping/aligned
    const FILL_DARK   = 'background:linear-gradient(135deg,#c62828,#8d1414);';
    const FILL_BRIGHT = 'background:linear-gradient(135deg,#ef5350,#c62828);';
    const FILL_BLEND  = 'background:linear-gradient(135deg,#ef5350,#c62828);';
    const BR  = 'border-right:2px solid rgba(255,255,255,0.35);';
    const BD  = 'border-right:2px dashed rgba(255,255,255,0.5);';

    if (mode === 'half') {
      refBar.innerHTML =
        `<div class="ref-seg" style="width:50%;${FILL_BRIGHT}${BR}">1/2 🍎</div>` +
        `<div class="ref-seg empty" style="width:50%;">1/2</div>`;
    } else if (mode === 'quarters') {
      refBar.innerHTML =
        `<div class="ref-seg" style="width:25%;${FILL_DARK}${BR}">1/4</div>` +
        `<div class="ref-seg" style="width:25%;${FILL_BRIGHT}${BR}">1/4</div>` +
        `<div class="ref-seg empty" style="width:50%;">1/2</div>`;
    } else { // both
      refBar.innerHTML =
        `<div class="ref-seg" style="width:25%;${FILL_DARK}${BR}">1/4</div>` +
        `<div class="ref-seg" style="width:25%;${FILL_BRIGHT}${BD}">1/4</div>` +
        `<div class="ref-seg" style="width:50%;${FILL_BLEND}border-left:2px dashed rgba(255,255,255,0.5);">= 1/2 🍎</div>`;
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

        // Reveal equation slightly after the merge animation begins
        setTimeout(() => equation.classList.add('show'), 320);

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

  // ── Boot ──
  function init() {
    showHalf('anim-bounce');
    renderRefBar('half');
  }

  // Expose
  window.manipulative = {
    init,
    reset,
    split,
    smash,
    celebrate,
    showEquation,
    hideEquationAndWin,
    playSound,
    getState: () => visualState,
  };
})();
