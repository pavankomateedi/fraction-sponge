/* ─────────────────────────────────────────
   buddy.js — pick-a-buddy cartoon companion

   Two ORIGINAL kid characters (not based on
   any existing IP). The kid picks one on the
   hub; the chosen buddy cheers from the corner
   of the workspace during lessons. Choice
   persists in localStorage.
   ───────────────────────────────────────── */
(function () {
  'use strict';

  const KEY = 'fraction-fruit-lab.buddy';

  const BUDDIES = {
    girl: {
      name: 'Lily',
      svg: `
<svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M 28 118 Q 30 78 50 78 Q 70 78 72 118 Z" fill="#26A69A"/>
  <rect x="21" y="84" width="9" height="26" rx="4" fill="#F6C9A0"/>
  <rect x="70" y="84" width="9" height="26" rx="4" fill="#F6C9A0"/>
  <rect x="45" y="64" width="10" height="14" fill="#F6C9A0"/>
  <circle cx="50" cy="46" r="27" fill="#F6C9A0"/>
  <path d="M 23 46 Q 23 15 50 15 Q 77 15 77 46 Q 64 30 50 31 Q 36 30 23 46 Z" fill="#6D4C41"/>
  <circle cx="21" cy="48" r="10" fill="#6D4C41"/>
  <circle cx="79" cy="48" r="10" fill="#6D4C41"/>
  <circle cx="21" cy="37" r="4.5" fill="#FF7AA2"/>
  <circle cx="79" cy="37" r="4.5" fill="#FF7AA2"/>
  <circle cx="41" cy="47" r="6.5" fill="#ffffff" stroke="#d8c4af" stroke-width="1"/>
  <circle cx="59" cy="47" r="6.5" fill="#ffffff" stroke="#d8c4af" stroke-width="1"/>
  <g class="buddy-pupils">
    <circle cx="41" cy="48" r="3.4" fill="#3e2723"/>
    <circle cx="59" cy="48" r="3.4" fill="#3e2723"/>
  </g>
  <circle cx="34" cy="55" r="3.2" fill="#FF8A80" opacity="0.6"/>
  <circle cx="66" cy="55" r="3.2" fill="#FF8A80" opacity="0.6"/>
  <path d="M 42 57 Q 50 65 58 57" stroke="#3e2723" stroke-width="2.6" fill="none" stroke-linecap="round"/>
</svg>`,
    },
    boy: {
      name: 'Max',
      svg: `
<svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M 28 118 Q 30 78 50 78 Q 70 78 72 118 Z" fill="#42A5F5"/>
  <rect x="21" y="84" width="9" height="26" rx="4" fill="#E8B58A"/>
  <rect x="70" y="84" width="9" height="26" rx="4" fill="#E8B58A"/>
  <rect x="45" y="64" width="10" height="14" fill="#E8B58A"/>
  <circle cx="50" cy="46" r="27" fill="#E8B58A"/>
  <path d="M 23 44 Q 23 14 50 14 Q 77 14 77 44 Q 70 29 60 30 Q 55 25 50 28 Q 45 25 40 30 Q 30 29 23 44 Z" fill="#23150c"/>
  <circle cx="41" cy="47" r="6.5" fill="#ffffff" stroke="#cdb398" stroke-width="1"/>
  <circle cx="59" cy="47" r="6.5" fill="#ffffff" stroke="#cdb398" stroke-width="1"/>
  <g class="buddy-pupils">
    <circle cx="41" cy="48" r="3.4" fill="#23150c"/>
    <circle cx="59" cy="48" r="3.4" fill="#23150c"/>
  </g>
  <circle cx="34" cy="55" r="3.2" fill="#FF8A80" opacity="0.55"/>
  <circle cx="66" cy="55" r="3.2" fill="#FF8A80" opacity="0.55"/>
  <path d="M 42 57 Q 50 65 58 57" stroke="#23150c" stroke-width="2.6" fill="none" stroke-linecap="round"/>
</svg>`,
    },
  };

  function current() {
    try {
      const v = window.localStorage?.getItem(KEY);
      if (BUDDIES[v]) return v;
    } catch (_) {}
    return 'girl';
  }

  function setCurrent(id) {
    if (!BUDDIES[id]) return;
    try { window.localStorage?.setItem(KEY, id); } catch (_) {}
    renderPicker();
    showInWorkspace();
  }

  // ── Hub picker ──
  function renderPicker() {
    const el = document.getElementById('buddyPicker');
    if (!el) return;
    const cur = current();
    el.innerHTML =
      `<div class="buddy-picker-label">Choose your buddy</div>` +
      `<div class="buddy-options">` +
      Object.entries(BUDDIES).map(([id, b]) =>
        `<button type="button" class="buddy-opt${id === cur ? ' sel' : ''}" data-buddy="${id}" aria-pressed="${id === cur}" aria-label="Choose ${b.name}">` +
          `<span class="buddy-art">${b.svg}</span>` +
          `<span class="buddy-name">${b.name}</span>` +
        `</button>`
      ).join('') +
      `</div>`;
    el.querySelectorAll('.buddy-opt').forEach((btn) =>
      btn.addEventListener('click', () => setCurrent(btn.dataset.buddy)));
  }

  // ── Workspace companion ──
  function showInWorkspace() {
    const el = document.getElementById('buddy');
    if (!el) return;
    el.innerHTML = BUDDIES[current()].svg;
  }

  // Little celebratory hop (called on win).
  function cheer() {
    const el = document.getElementById('buddy');
    if (!el) return;
    el.classList.remove('buddy-cheer');
    void el.offsetWidth; // restart the animation
    el.classList.add('buddy-cheer');
  }

  // ── Eyes follow the cursor ──
  // On desktop, the buddy's pupils track the mouse so it looks like it's
  // watching what the kid does. Offset is tiny + clamped so the pupils
  // stay inside the eye-whites. (Touch devices have no cursor → pupils
  // rest centered, which is fine.)
  const MAX_OFFSET = 2.6; // SVG user units
  function trackCursor(e) {
    const el = document.getElementById('buddy');
    if (!el) return;
    const pupils = el.querySelector('.buddy-pupils');
    if (!pupils) return;
    const r = el.getBoundingClientRect();
    if (!r.width) return; // hidden / not in a lesson
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let dx = e.clientX - cx;
    let dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy) || 1;
    dx = (dx / dist) * MAX_OFFSET;
    dy = (dy / dist) * MAX_OFFSET;
    pupils.setAttribute('transform', `translate(${dx.toFixed(2)} ${dy.toFixed(2)})`);
  }

  function init() {
    renderPicker();
    window.addEventListener('mousemove', trackCursor);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.buddy = { current, setCurrent, renderPicker, showInWorkspace, cheer, BUDDIES };
})();
