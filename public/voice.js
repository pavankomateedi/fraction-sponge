/* ─────────────────────────────────────────
   voice.js — text-to-speech narration

   Reads Pip's chat bubbles aloud using the
   browser's Web Speech API. Hooks into the
   'pipSpoke' event that app.js dispatches
   whenever a new Pip bubble is rendered.

   Fractions are pre-processed so "1/2" is
   read as "one half" — not "one slash two".

   Same iOS rule as the audio context applies:
   speech only fires after the first user
   tap. From then on, every Pip line speaks.
   ───────────────────────────────────────── */
(function () {
  'use strict';

  const STORAGE_KEY = 'fraction-fruit-lab.voice';
  const DEFAULT_ENABLED = true;

  // Spelled-out fractions for cleaner narration.
  const FRACTION_WORDS = {
    '1/2': 'one half',
    '2/2': 'two halves',
    '1/3': 'one third',
    '2/3': 'two thirds',
    '1/4': 'one quarter',
    '2/4': 'two quarters',
    '3/4': 'three quarters',
    '1/6': 'one sixth',
    '2/6': 'two sixths',
    '3/6': 'three sixths',
    '4/6': 'four sixths',
    '5/6': 'five sixths',
    '1/8': 'one eighth',
    '2/8': 'two eighths',
    '3/8': 'three eighths',
    '4/8': 'four eighths',
    '5/8': 'five eighths',
    '6/8': 'six eighths',
    '7/8': 'seven eighths',
  };

  let enabled = readPref();
  let toggleBtn = null;
  let voicesReady = false;
  let chosenVoice = null;

  const supported = typeof window.speechSynthesis !== 'undefined'
                 && typeof window.SpeechSynthesisUtterance !== 'undefined';

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

  // ── Text normalization for speech ──
  function speechText(raw) {
    if (!raw) return '';
    let s = String(raw);

    // Strip emoji + variation selectors. Web Speech reads them as "emoji
    // X" or pauses awkwardly, which is jarring for kids.
    s = s.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}️]/gu, ' ');

    // Replace fraction-like tokens with spoken forms.
    s = s.replace(/(\d+)\/(\d+)/g, (match, n, d) => {
      const key = `${n}/${d}`;
      return FRACTION_WORDS[key] || `${n} over ${d}`;
    });

    // Normalize special punctuation that confuses some TTS voices.
    s = s.replace(/—/g, ', ').replace(/–/g, ', ');
    s = s.replace(/…/g, '...');

    // Collapse extra whitespace.
    s = s.replace(/\s+/g, ' ').trim();

    return s;
  }

  // ── Voice picking ──
  function pickVoice() {
    if (!supported) return null;
    const voices = window.speechSynthesis.getVoices() || [];
    if (!voices.length) return null;

    // Prefer English, prefer something that sounds friendly. Order matters.
    const preferences = [
      (v) => v.lang === 'en-US' && /samantha/i.test(v.name),
      (v) => v.lang === 'en-US' && /karen|tessa|fiona|moira/i.test(v.name),
      (v) => v.lang === 'en-US' && /google.*us english/i.test(v.name),
      (v) => /en-US/i.test(v.lang),
      (v) => /^en/i.test(v.lang),
    ];

    for (const pref of preferences) {
      const found = voices.find(pref);
      if (found) return found;
    }
    return voices[0];
  }

  function ensureVoice() {
    if (chosenVoice) return chosenVoice;
    chosenVoice = pickVoice();
    return chosenVoice;
  }

  // ── Speaking ──
  function speak(rawText) {
    if (!supported || !enabled) return;
    const text = speechText(rawText);
    if (!text || text.length < 2) return;

    try {
      // Cancel anything currently being spoken — keeps Pip's bubbles
      // from piling up if the kid speeds through clicks.
      window.speechSynthesis.cancel();

      const utter = new SpeechSynthesisUtterance(text);
      const v = ensureVoice();
      if (v) utter.voice = v;
      utter.lang = (v && v.lang) || 'en-US';
      utter.rate = 0.95;   // slightly slower than default for clarity
      utter.pitch = 1.05;  // slightly brighter for kid-friendly feel
      utter.volume = 1.0;
      window.speechSynthesis.speak(utter);
    } catch (err) {
      // Never block the lesson on a TTS failure.
      console.warn('[voice] speak failed:', err.message);
    }
  }

  function cancel() {
    if (!supported) return;
    try { window.speechSynthesis.cancel(); } catch (_) {}
  }

  // ── Enable / disable ──
  function setEnabled(value) {
    enabled = Boolean(value);
    writePref(enabled);
    syncToggleUI();
    if (!enabled) cancel();
  }

  function syncToggleUI() {
    if (!toggleBtn) return;
    toggleBtn.setAttribute('aria-pressed', String(enabled));
    toggleBtn.classList.toggle('on', enabled);
    toggleBtn.classList.toggle('off', !enabled);
    toggleBtn.setAttribute(
      'aria-label',
      enabled ? 'Voice narration on — tap to turn off' : 'Voice narration off — tap to turn on'
    );
  }

  // ── Boot ──
  function init() {
    toggleBtn = document.getElementById('voiceToggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => setEnabled(!enabled));
    }
    syncToggleUI();

    // Some browsers populate voices async. Latch on so our first speak()
    // gets a real voice.
    if (supported && window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = () => {
        voicesReady = true;
        chosenVoice = pickVoice();
      };
    }
    chosenVoice = pickVoice();
    voicesReady = Boolean(chosenVoice);

    // Listen for the event app.js dispatches whenever Pip says something.
    window.addEventListener('pipSpoke', (e) => {
      const text = e?.detail?.text;
      if (text) speak(text);
    });

    // Cancel speech on page hide so it doesn't keep talking when you
    // switch tabs.
    window.addEventListener('pagehide', cancel);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for manual control + testing.
  window.voice = {
    speak,
    cancel,
    setEnabled,
    isEnabled: () => enabled,
    isSupported: () => supported,
    speechText, // exposed for tests / debugging
  };
})();
