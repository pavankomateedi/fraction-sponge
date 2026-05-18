/* ─────────────────────────────────────────
   manipulative.js — fraction workspace
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
      tone(600,  'sine', 0.12, 0.25, 0);
      tone(900,  'sine', 0.10, 0.20, 0.07);
      tone(1200, 'sine', 0.08, 0.15, 0.14);
    },
    smash: () => {
      tone(180, 'sawtooth', 0.09, 0.32, 0);
      tone(140, 'sawtooth', 0.13, 0.28, 0.05);
      tone(420, 'sine',     0.10, 0.22, 0.17);
    },
    win: () => {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 'sine', 0.32, 0.24, i * 0.11));
    },
  };

  // ── State ──
  // 'half'      — single 1/2 block visible (initial / reset)
  // 'quarters'  — two 1/4 blocks visible (after split)
  // 'merged'    — single 1/2 again + equation visible (after smash)
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
    const BR  = 'border-right:2px solid rgba(255,255,255,0.35)';
    const BD  = 'border-right:2px dashed rgba(255,255,255,0.5)';

    if (mode === 'half') {
      refBar.innerHTML =
        `<div class="ref-seg" style="width:50%;background:linear-gradient(135deg,#FF6B35,#FF9A5C);${BR}">1/2</div>` +
        `<div class="ref-seg empty" style="width:50%;">1/2</div>`;
    } else if (mode === 'quarters') {
      refBar.innerHTML =
        `<div class="ref-seg" style="width:25%;background:linear-gradient(135deg,#F7971E,#FFD200);${BR}">1/4</div>` +
        `<div class="ref-seg" style="width:25%;background:linear-gradient(135deg,#f953c6,#b91d73);${BR}">1/4</div>` +
        `<div class="ref-seg empty" style="width:50%;">1/2</div>`;
    } else { // both
      refBar.innerHTML =
        `<div class="ref-seg" style="width:25%;background:linear-gradient(135deg,#F7971E,#FFD200);${BR}">1/4</div>` +
        `<div class="ref-seg" style="width:25%;background:linear-gradient(135deg,#f953c6,#b91d73);${BD}">1/4</div>` +
        `<div class="ref-seg" style="width:50%;background:linear-gradient(135deg,#FF6B35,#FF9A5C);border-left:2px dashed rgba(255,255,255,0.5)">= 1/2</div>`;
    }
  }

  function makeFracBlock(cls, extraAnim) {
    const d = document.createElement('div');
    d.className = `frac-block ${cls} ${extraAnim || ''}`.trim();
    const [n, den] = cls.includes('half') ? ['1', '2'] : ['1', '4'];
    d.innerHTML = `
      <div class="frac-display">
        <span class="frac-num">${n}</span>
        <div class="frac-bar-line"></div>
        <span class="frac-den">${den}</span>
      </div>`;
    return d;
  }

  function clearPieces() {
    piecesArea.innerHTML = '';
  }

  function showHalf(animClass) {
    clearPieces();
    piecesArea.appendChild(makeFracBlock('half', animClass));
  }

  function showQuarters() {
    clearPieces();
    piecesArea.appendChild(makeFracBlock('quarter-a', 'anim-slide-l'));
    piecesArea.appendChild(makeFracBlock('quarter-b', 'anim-slide-r'));
  }

  function emit(type, detail = {}) {
    window.dispatchEvent(new CustomEvent('pieceAction', { detail: { type, ...detail } }));
  }

  // ── Public API ──
  // Each action returns a Promise that resolves when its animation+sound finish,
  // so the tutor can sequence dialogue cleanly.
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
    sounds.split();
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
        sounds.smash();
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
    sounds.win();
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
    const colors = ['#FF6B35', '#FFD200', '#f953c6', '#5a3fc0', '#2bb673', '#FF6B6B', '#00cfff', '#fff'];

    for (let i = 0; i < 38; i++) {
      setTimeout(() => {
        const c = document.createElement('div');
        const sz = 7 + Math.random() * 10;
        const dur = 1.2 + Math.random() * 0.9;
        const del = Math.random() * 0.55;
        const isRound = Math.random() > 0.45;
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
      }, i * 42);
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
    getState: () => visualState,
  };
})();
