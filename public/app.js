/* ─────────────────────────────────────────
   app.js — glue layer
   Renders Pip + answer choices, listens for
   user input, advances tutorScript, drives
   manipulative, calls /api/tutor for hints.
   ───────────────────────────────────────── */
(function () {
  'use strict';

  const messagesEl = document.getElementById('messages');
  const choicesEl  = document.getElementById('choices');

  // Lock UI while an animation or API call is in flight.
  let busy = false;

  // ── Message rendering ──
  let bubbleSeq = 0;
  function pipBubble(text, opts = {}) {
    const wrap = document.createElement('div');
    wrap.className = 'msg from-pip';
    const bubbleId = opts.id || `pip-bubble-${++bubbleSeq}`;
    wrap.innerHTML = `
      <div class="msg-avatar" aria-hidden="true">🍎</div>
      <div class="msg-bubble" id="${bubbleId}">${escape(text)}</div>`;
    messagesEl.appendChild(wrap);
    scrollChat();

    // Voice narration: voice.js listens for this event and speaks the
    // bubble text (with fractions normalized to words). Skipped if the
    // caller opts out (e.g., system-y notes we never want spoken).
    if (!opts.silent) {
      try {
        window.dispatchEvent(new CustomEvent('pipSpoke', { detail: { text, id: bubbleId } }));
      } catch (_) {}
    }

    return { wrap, id: bubbleId };
  }

  function studentBubble(text) {
    const wrap = document.createElement('div');
    wrap.className = 'msg from-student';
    wrap.innerHTML = `<div class="msg-bubble">${escape(text)}</div>`;
    messagesEl.appendChild(wrap);
    scrollChat();
    return wrap;
  }

  function typingIndicator() {
    const wrap = document.createElement('div');
    wrap.className = 'msg from-pip msg-typing';
    wrap.innerHTML = `
      <div class="msg-avatar" aria-hidden="true">🧽</div>
      <div class="msg-bubble">
        <span class="dot"></span><span class="dot"></span><span class="dot"></span>
      </div>`;
    messagesEl.appendChild(wrap);
    scrollChat();
    return wrap;
  }

  function escape(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function scrollChat() {
    requestAnimationFrame(() => {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });
  }

  // ── Choice rendering ──
  function clearChoices() {
    choicesEl.innerHTML = '';
  }

  function renderAdvanceButton(action, onTap) {
    clearChoices();
    const btn = document.createElement('button');
    btn.className = `choice-btn ${action.style === 'green' ? 'green' : 'primary'}`;
    btn.type = 'button';
    btn.textContent = action.label;
    // Screen readers benefit from a clearer label than the emoji-prefixed visible text.
    if (action.ariaLabel) btn.setAttribute('aria-label', action.ariaLabel);
    btn.addEventListener('click', () => {
      if (busy) return;
      manipulative.playSound('tap');
      onTap();
    });
    choicesEl.appendChild(btn);
  }

  function renderChoices(choices, onPick, questionPromptId) {
    clearChoices();
    choices.forEach((c, idx) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.type = 'button';
      btn.textContent = c.label;
      btn.dataset.id = c.id;
      // Tie each choice to the question above for screen-reader context.
      if (questionPromptId) {
        btn.setAttribute('aria-describedby', questionPromptId);
      }
      btn.setAttribute('aria-label', `Answer ${idx + 1} of ${choices.length}: ${c.label}`);
      btn.addEventListener('click', () => {
        if (busy) return;
        manipulative.playSound('tap');
        onPick(c, btn);
      });
      choicesEl.appendChild(btn);
    });
  }

  function setChoicesDisabled(disabled) {
    choicesEl.querySelectorAll('.choice-btn').forEach((b) => {
      b.disabled = disabled;
    });
  }

  // ── API ──
  // 8s timeout so a slow/unreachable Claude call doesn't strand a 9-year-old
  // staring at a typing indicator. Falls through to scripted client text.
  const API_TIMEOUT_MS = 8000;

  async function fetchTutor({ qId, prompt, studentAnswer, attemptNumber, mode = 'hint' }) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), API_TIMEOUT_MS);
    try {
      const res = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qId, prompt, studentAnswer, attemptNumber, mode }),
        signal: ctl.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('[tutor] API failed, using client fallback', err.name || err);
      return { message: clientFallback(qId, mode), source: 'fallback' };
    } finally {
      clearTimeout(timer);
    }
  }

  // Last-resort fallback if even the server is offline.
  function clientFallback(qId, mode) {
    const q = tutorScript.checkQuestions.find((x) => x.id === qId);
    if (!q) return "Take another look at the pieces. What do you see? 🤔";
    if (mode === 'rephrase') return q.rephrase;
    return q.hints[0];
  }

  // ── Stage renderers ──
  function renderStage() {
    const s = tutorScript.state();

    if (s.stage === 'check') {
      renderCheckQuestion();
      return;
    }

    if (s.stage === 'win') {
      pipBubble(s.cfg.pip);
      renderAdvanceButton(s.cfg.action, handlePlayAgain);
      return;
    }

    // Linear stages: idle / split / smash
    pipBubble(s.cfg.pip);
    renderAdvanceButton(s.cfg.action, () => handleAdvance(s.stage));
  }

  function renderCheckQuestion() {
    const { question, questionIdx, totalQuestions } = tutorScript.state();
    if (!question) return;
    // Subtle progress hint so the kid can feel momentum.
    const progress = ` (${questionIdx + 1}/${totalQuestions})`;
    const { id } = pipBubble(question.prompt + progress);
    renderChoices(
      question.choices,
      (choice, btn) => handleChoice(question, choice, btn),
      id
    );
  }

  // ── Handlers ──
  async function handleAdvance(stage) {
    busy = true;
    clearChoices();

    if (stage === 'idle') {
      await manipulative.split();
    } else if (stage === 'split') {
      await manipulative.smash();
    }
    // 'smash' → 'check': no manipulative change needed

    tutorScript.advance();
    busy = false;
    renderStage();
  }

  async function handleChoice(question, choice) {
    busy = true;
    setChoicesDisabled(true);
    studentBubble(choice.label);

    if (choice.correct) {
      // Soft positive chime — fires before Pip's text cheer for snappy feedback
      manipulative.playSound('correct');
      const cheer = tutorScript.correctCheerFor(question.id);
      await pause(280);
      pipBubble(cheer);
      await pause(900);

      const hadMore = tutorScript.nextQuestion();
      if (hadMore) {
        // If the new question introduces a different fruit, mark the
        // chapter change with a brief upward sweep AND swap the
        // workspace visual so the right side follows the chat.
        const next = tutorScript.currentQuestion();
        if (next && next.fruit && next.fruit !== question.fruit) {
          manipulative.playSound('transition');
          const newKey = fruitKeyFromEmoji(next.fruit);
          if (newKey) manipulative.showFruit(newKey);
        }
        busy = false;
        renderStage();
        return;
      }

      // Last question complete → win
      tutorScript.advance(); // 'check' → 'win'
      await goWin();
      return;
    }

    // Wrong answer flow — warm "hmm" tone, never punitive
    manipulative.playSound('wrong');
    tutorScript.recordWrongAttempt();
    const { attempts } = tutorScript.state();

    // Hint from Claude (or scripted fallback).
    const typing = typingIndicator();
    const hint = await fetchTutor({
      qId: question.id,
      prompt: question.prompt,
      studentAnswer: choice.label,
      attemptNumber: attempts,
      mode: 'hint',
    });
    typing.remove();
    pipBubble(hint.message);

    // On 2nd+ wrong attempt, also re-phrase the question.
    if (attempts >= 2) {
      const typing2 = typingIndicator();
      const rephrase = await fetchTutor({
        qId: question.id,
        prompt: question.prompt,
        studentAnswer: choice.label,
        attemptNumber: attempts,
        mode: 'rephrase',
      });
      typing2.remove();
      pipBubble(rephrase.message);
    }

    setChoicesDisabled(false);
    busy = false;
  }

  async function goWin() {
    await manipulative.celebrate();
    busy = false;
    renderStage();
  }

  async function handlePlayAgain() {
    busy = true;
    clearChoices();
    if (window.voice && typeof window.voice.cancel === 'function') {
      window.voice.cancel();
    }
    await pause(150);
    messagesEl.innerHTML = '';
    await manipulative.reset();
    tutorScript.resetAll();
    busy = false;
    renderStage();
  }

  // ── Utilities ──
  function pause(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  // Maps a check-question's `fruit` emoji to the manipulative.showFruit() key.
  // The discriminate question (Q6) uses BOTH apple + banana emoji, so check
  // that combo first.
  function fruitKeyFromEmoji(emoji) {
    if (!emoji) return null;
    if (emoji.includes('🍎') && emoji.includes('🍌')) return 'compare';
    if (emoji.includes('🍕')) return 'pizza';
    if (emoji.includes('🍌')) return 'banana';
    if (emoji.includes('🍊')) return 'orange';
    if (emoji.includes('🍎')) return 'apple';
    return null;
  }

  // ── Boot ──
  function init() {
    manipulative.init();
    renderStage();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
