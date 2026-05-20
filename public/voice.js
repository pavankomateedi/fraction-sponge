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
  // Once we lock onto a voice we NEVER change it for the session — this
  // is what stops the accent flipping (e.g. male → female) mid-lesson
  // when the browser's async voice list settles after the first utterance.
  let chosenVoice = null;
  let voiceLocked = false;

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
  // Target a British (en-GB) voice with a young, friendly quality —
  // think Peppa Pig. Order matters: most-specific British female voices
  // first, then any en-GB, then any English as a last resort.
  function pickVoice() {
    if (!supported) return null;
    const voices = window.speechSynthesis.getVoices() || [];
    if (!voices.length) return null;

    const preferences = [
      // Named British voices known to be female / young-sounding
      (v) => /en-GB/i.test(v.lang) && /(google uk english female)/i.test(v.name),
      (v) => /en-GB/i.test(v.lang) && /(kate|serena|martha|hazel|stephanie|amelie|fiona)/i.test(v.name),
      // Any female-flagged British voice
      (v) => /en-GB/i.test(v.lang) && /female/i.test(v.name),
      // Any British voice at all (keeps the accent even if male)
      (v) => /en-GB/i.test(v.lang),
      (v) => /en[-_]?gb/i.test(v.name),
      // English fallback so narration still works where no en-GB exists
      (v) => /en-US/i.test(v.lang) && /samantha|google us english/i.test(v.name),
      (v) => /^en/i.test(v.lang),
    ];

    for (const pref of preferences) {
      const found = voices.find(pref);
      if (found) return found;
    }
    return voices[0];
  }

  // Returns the locked voice, choosing it once if not yet locked.
  // After the first successful lock the voice never changes for the session.
  function ensureVoice() {
    if (voiceLocked && chosenVoice) return chosenVoice;
    const v = pickVoice();
    if (v) {
      chosenVoice = v;
      voiceLocked = true;
    }
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
      utter.lang = (v && v.lang) || 'en-GB';
      utter.rate = 0.95;   // slightly slower than default for clarity
      utter.pitch = 1.25;  // higher + brighter — young, Peppa-Pig-ish quality
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

    // Browsers populate voices async. We pre-pick when the list arrives,
    // but ONLY until the voice is locked (first actual speak). After that
    // we leave it alone so the accent never changes mid-lesson.
    if (supported && window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = () => {
        if (!voiceLocked) chosenVoice = pickVoice();
      };
    }
    chosenVoice = pickVoice();

    // Listen for the event app.js dispatches whenever Pip says something.
    window.addEventListener('pipSpoke', (e) => {
      const text = e?.detail?.text;
      if (text) speak(text);
    });

    // iOS/Safari unlock: speechSynthesis stays blocked until a speak()
    // call happens inside a real user gesture. Fire a near-silent priming
    // utterance on the very first interaction anywhere on the page (e.g.
    // tapping a hub lesson card) so later narration isn't swallowed.
    let primed = false;
    const primeSpeech = () => {
      if (primed || !supported) return;
      primed = true;
      try {
        const u = new SpeechSynthesisUtterance(' ');
        u.volume = 0;
        const v = ensureVoice();
        if (v) u.voice = v;
        window.speechSynthesis.resume();
        window.speechSynthesis.speak(u);
      } catch (_) {}
      ['pointerdown', 'touchstart', 'click', 'keydown'].forEach((ev) =>
        window.removeEventListener(ev, primeSpeech, true));
    };
    ['pointerdown', 'touchstart', 'click', 'keydown'].forEach((ev) =>
      window.addEventListener(ev, primeSpeech, true));

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
