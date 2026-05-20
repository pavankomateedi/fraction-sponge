/* ─────────────────────────────────────────
   app.js — glue layer
   Renders Pip + answer choices, listens for
   user input, advances tutorScript, drives
   manipulative, calls /api/tutor for hints.
   ───────────────────────────────────────── */
(function () {
  'use strict';

  const messagesEl  = document.getElementById('messages');
  const choicesEl   = document.getElementById('choices');
  const progressEl  = document.getElementById('progress');
  const hubEl       = document.getElementById('hub');
  const hubCardsEl  = document.getElementById('hubCards');
  const appEl       = document.querySelector('.app');
  const homeBtn     = document.getElementById('homeBtn');
  const lessonTitle = document.getElementById('lessonTitle');

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

    // Progress dots only belong to the check phase.
    hideProgress();

    if (s.stage === 'win') {
      tutorScript.markComplete(s.lessonId);
      pipBubble(s.cfg.pip);
      renderWinButtons(s.cfg.action);
      return;
    }

    // Linear stages: idle / split / smash
    pipBubble(s.cfg.pip);
    renderAdvanceButton(s.cfg.action, () => handleAdvance(s.stage));
  }

  function renderCheckQuestion() {
    const { question, questionIdx, totalQuestions } = tutorScript.state();
    if (!question) return;
    // Keep the workspace visual in sync with THIS question's fruit. Matters
    // now that lesson 1's order is shuffled — the first check question may
    // not be apple, so we can't rely on the post-smash state. (Questions
    // with no fruit, e.g. comparing/adding, leave the current visual alone.)
    if (question.fruit) {
      const key = fruitKeyFromEmoji(question.fruit);
      if (key && manipulative.getState() !== key) manipulative.showFruit(key);
    }
    // IMPORTANT: the prompt is both displayed AND spoken by TTS. We must
    // NOT bake the progress count into it — "(3/7)" gets read aloud as a
    // fraction ("three sevenths"), which confuses the lesson. Progress
    // lives in a separate dots indicator instead.
    const { id } = pipBubble(question.prompt);
    renderProgress(questionIdx, totalQuestions);
    renderChoices(
      question.choices,
      (choice, btn) => handleChoice(question, choice, btn),
      id
    );
  }

  // Dots indicator: ●●●○○○○ — filled = done/current, hollow = upcoming.
  // Lives outside the chat bubble so it is never spoken by TTS.
  function renderProgress(idx, total) {
    if (!progressEl) return;
    progressEl.hidden = false;
    const dots = Array.from({ length: total }, (_, i) => {
      const cls = i < idx ? 'done' : (i === idx ? 'current' : 'upcoming');
      return `<span class="progress-dot ${cls}" aria-hidden="true"></span>`;
    }).join('');
    progressEl.innerHTML =
      `<span class="progress-label">Question ${idx + 1} of ${total}</span>` +
      `<span class="progress-dots">${dots}</span>`;
  }

  function hideProgress() {
    if (progressEl) {
      progressEl.hidden = true;
      progressEl.innerHTML = '';
    }
  }

  // ── Handlers ──
  async function handleAdvance(stage) {
    busy = true;
    clearChoices();

    // Each stage declares which manipulative method its button triggers
    // (e.g. equivalence idle → 'split', adding idle → 'addingCombine').
    const cfg = tutorScript.state().cfg;
    const manipName = cfg && cfg.manip;
    if (manipName && typeof manipulative[manipName] === 'function') {
      await manipulative[manipName]();
    }

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
        // If the next question is a different fruit, play the chapter-change
        // sweep. The actual visual swap is handled by renderCheckQuestion
        // (which keeps the workspace in sync regardless of shuffled order).
        const next = tutorScript.currentQuestion();
        if (next && next.fruit && next.fruit !== question.fruit) {
          manipulative.playSound('transition');
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

  // Win screen offers two paths: replay this lesson, or return to the hub
  // to pick another. Both are rendered as choice-style buttons.
  function renderWinButtons(action) {
    clearChoices();
    // Play Again
    const again = document.createElement('button');
    again.className = 'choice-btn primary';
    again.type = 'button';
    again.textContent = action.label;
    if (action.ariaLabel) again.setAttribute('aria-label', action.ariaLabel);
    again.addEventListener('click', () => { if (!busy) { manipulative.playSound('tap'); handlePlayAgain(); } });
    choicesEl.appendChild(again);
    // Pick another lesson
    const pick = document.createElement('button');
    pick.className = 'choice-btn';
    pick.type = 'button';
    pick.textContent = '📚  Pick another lesson';
    pick.setAttribute('aria-label', 'Go back and pick another lesson');
    pick.addEventListener('click', () => { if (!busy) { manipulative.playSound('tap'); goToHub(); } });
    choicesEl.appendChild(pick);
  }

  async function handlePlayAgain() {
    busy = true;
    clearChoices();
    if (window.voice && typeof window.voice.cancel === 'function') {
      window.voice.cancel();
    }
    await pause(150);
    messagesEl.innerHTML = '';
    tutorScript.resetActiveLesson();
    await manipulative.reset();
    manipulative.setup(tutorScript.manipInit());
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
    if (emoji.includes('🍉')) return 'watermelon';
    if (emoji.includes('🍌')) return 'banana';
    if (emoji.includes('🍊')) return 'orange';
    if (emoji.includes('🍎')) return 'apple';
    return null;
  }

  // ── Hub ──
  function renderHub() {
    if (!hubCardsEl) return;
    const lessons = tutorScript.listLessons();
    hubCardsEl.innerHTML = '';
    lessons.forEach((les) => {
      const card = document.createElement('button');
      card.className = `hub-card ${les.done ? 'done' : ''}`;
      card.type = 'button';
      card.setAttribute('aria-label', `${les.title}. ${les.blurb}${les.done ? ' Completed.' : ''}`);
      card.innerHTML = `
        <span class="hub-card-emoji" aria-hidden="true">${les.emoji}</span>
        <span class="hub-card-text">
          <span class="hub-card-title">${escape(les.title)}</span>
          <span class="hub-card-blurb">${escape(les.blurb)}</span>
        </span>
        <span class="hub-card-badge" aria-hidden="true">${les.done ? '✓' : '▶'}</span>`;
      card.addEventListener('click', () => startLesson(les.id));
      hubCardsEl.appendChild(card);
    });
  }

  function showHub() {
    if (window.voice && typeof window.voice.cancel === 'function') window.voice.cancel();
    renderHub();
    if (hubEl) hubEl.hidden = false;
    if (appEl) appEl.hidden = true;
  }

  function goToHub() {
    busy = false;
    messagesEl.innerHTML = '';
    clearChoices();
    hideProgress();
    showHub();
  }

  function startLesson(id) {
    if (!tutorScript.loadLesson(id)) return;
    const les = tutorScript.LESSONS[id];
    if (lessonTitle) lessonTitle.textContent = les.title;
    if (hubEl) hubEl.hidden = true;
    if (appEl) appEl.hidden = false;
    messagesEl.innerHTML = '';
    clearChoices();
    hideProgress();
    manipulative.setup(tutorScript.manipInit());
    busy = false;
    renderStage();
  }

  // ── Boot ──
  function init() {
    manipulative.init();
    if (homeBtn) homeBtn.addEventListener('click', () => { if (!busy) goToHub(); });
    showHub();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
