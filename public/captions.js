/* ─────────────────────────────────────────
   captions.js — closed captions for sound effects

   Listens for `soundPlayed` events dispatched by
   manipulative.js. When captions are enabled, a
   small floating badge pops in near the top of
   the screen ("✂️ slice!", "🤲 squish!", etc.),
   then fades out. Persistence: localStorage.
   Default: ON — accessibility-first.

   For Deaf / hard-of-hearing users this turns
   every audio cue into a visible cue. Hearing
   users can toggle it off.
   ───────────────────────────────────────── */
(function () {
  'use strict';

  const STORAGE_KEY = 'fraction-fruit-lab.captions';
  const DEFAULT_ENABLED = true;

  // Sound name → human-readable caption.
  // 'tap' is intentionally omitted — every button press would spam.
  const CAPTIONS = {
    split:      { emoji: '✂️',  text: 'slice!' },
    smash:      { emoji: '🤲',  text: 'squish!' },
    correct:    { emoji: '✨',  text: 'yes!' },
    wrong:      { emoji: '💭',  text: 'hmm…' },
    transition: { emoji: '🌟',  text: 'new fruit!' },
    win:        { emoji: '🎉',  text: 'hooray!' },
  };

  let container = null;
  let toggleBtn = null;
  let enabled = readPref();

  // ── Persistence ──
  function readPref() {
    try {
      const v = window.localStorage?.getItem(STORAGE_KEY);
      if (v === 'off') return false;
      if (v === 'on') return true;
    } catch (_) {}
    return DEFAULT_ENABLED;
  }

  function writePref(value) {
    try {
      window.localStorage?.setItem(STORAGE_KEY, value ? 'on' : 'off');
    } catch (_) {}
  }

  // ── Rendering ──
  function showCaption(name) {
    if (!enabled) return;
    const cfg = CAPTIONS[name];
    if (!cfg || !container) return;

    const pill = document.createElement('div');
    pill.className = 'caption-pill';
    pill.innerHTML =
      `<span class="caption-emoji" aria-hidden="true">${cfg.emoji}</span>` +
      `<span class="caption-text">${cfg.text}</span>`;
    container.appendChild(pill);

    // Auto-cleanup after the animation finishes
    setTimeout(() => {
      pill.classList.add('caption-out');
      setTimeout(() => pill.remove(), 350);
    }, 1500);

    // Cap the on-screen pile so rapid sounds don't stack forever
    const pills = container.querySelectorAll('.caption-pill');
    if (pills.length > 4) {
      pills[0].remove();
    }
  }

  function setEnabled(value) {
    enabled = Boolean(value);
    writePref(enabled);
    syncToggleUI();
    if (!enabled && container) {
      container.querySelectorAll('.caption-pill').forEach((p) => p.remove());
    }
  }

  function syncToggleUI() {
    if (!toggleBtn) return;
    toggleBtn.setAttribute('aria-pressed', String(enabled));
    toggleBtn.classList.toggle('on', enabled);
    toggleBtn.classList.toggle('off', !enabled);
    toggleBtn.setAttribute(
      'aria-label',
      enabled ? 'Captions on — tap to turn off' : 'Captions off — tap to turn on'
    );
    const labelEl = toggleBtn.querySelector('.cc-label');
    if (labelEl) labelEl.textContent = enabled ? 'CC' : 'CC';
  }

  // ── Boot ──
  function init() {
    container = document.getElementById('captions');
    toggleBtn = document.getElementById('captionsToggle');

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => setEnabled(!enabled));
    }
    syncToggleUI();

    window.addEventListener('soundPlayed', (e) => {
      const name = e?.detail?.name;
      if (name) showCaption(name);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for testing / manual triggering
  window.captions = {
    show: showCaption,
    setEnabled,
    isEnabled: () => enabled,
  };
})();
