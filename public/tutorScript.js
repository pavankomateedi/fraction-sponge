/* ─────────────────────────────────────────
   tutorScript.js — lesson state machine
   Pure data + transitions. No DOM, no fetch.
   app.js renders and drives.
   ───────────────────────────────────────── */
(function () {
  'use strict';

  // ── Linear stages ──
  //   idle    — Pip greets, "Split it!" button
  //   split   — after split, "Smash them!" button
  //   smash   — after smash, "Tell me more!" advances to check
  //   check   — iterates through checkQuestions[]
  //   win     — confetti + play again
  const stages = {
    idle: {
      pip: "Hey! I'm Pip 🧽 I've got one half. I wonder what's hiding inside it... 👀",
      action: { type: 'advance', label: '✂️  Split it!', style: 'primary' },
      next: 'split',
    },
    split: {
      pip: "Whoa, two pieces! Each one is one-fourth (1/4). Hmm... do you think they're still the same size as before? 🤔",
      action: { type: 'advance', label: '🔨  Smash them!', style: 'primary' },
      next: 'smash',
    },
    smash: {
      pip: "They fit back PERFECTLY! 1/2 and 2/4 take up the same space! 🤯",
      action: { type: 'advance', label: "Let's check what you got! ✨", style: 'green' },
      next: 'check',
    },
    win: {
      pip: "You discovered equivalent fractions! Two fractions that look different but mean the SAME thing. 🌟",
      action: { type: 'reset', label: '🔄  Play Again!', style: 'primary' },
      next: 'idle',
    },
  };

  // ── Check-for-understanding bank ──
  // Progression: recall → recall(count) → apply → apply(count)
  //            → transfer → discriminate (NOT equivalent) → capstone
  // Pip's "cheer" line plays on correct answers; hints[] are the scripted
  // fallbacks when Claude is unavailable.
  const checkQuestions = [
    {
      id: 'q1',
      kind: 'compare',
      prompt: "Quick question — which is bigger: 1/2 or 2/4?",
      choices: [
        { id: 'a', label: '1/2 is bigger',         correct: false },
        { id: 'b', label: '2/4 is bigger',         correct: false },
        { id: 'c', label: "They're the same! 🎯", correct: true  },
      ],
      cheer: "YES! Same size, different name. That's the whole trick. 🎯",
      hints: [
        "Hmm — when you smashed the two fourths together, did they fit perfectly into the half? What does that tell you? 🤔",
        "Look at the bar at the top. The orange and the two pieces cover the same space, right? So they're the…?",
      ],
      rephrase: "Take another look. Which one wins — 1/2 or 2/4 — or is something else going on? 🤔",
    },
    {
      id: 'q2',
      kind: 'count',
      prompt: "Nice. Now look — how many one-fourth blocks fit inside one half?",
      choices: [
        { id: 'a', label: '1 fourth',  correct: false },
        { id: 'b', label: '2 fourths', correct: true  },
        { id: 'c', label: '4 fourths', correct: false },
      ],
      cheer: "Exactly! Two-fourths makes one-half. You can SEE it. 🧠",
      hints: [
        "Picture the smash you just did. Two pieces snapped back into one half — how many is that?",
        "One half = two fourths. So how many fourths fit inside one half? Count them in your head 🧠",
      ],
      rephrase: "Try again — how many one-fourth pieces snap together to make one half?",
    },
    {
      id: 'q3',
      kind: 'apply',
      prompt: "Cool. New one — is 3/6 the same as 1/2?",
      choices: [
        { id: 'a', label: 'Yes — same size! ✨',    correct: true  },
        { id: 'b', label: 'No, totally different',  correct: false },
        { id: 'c', label: 'Not sure',               correct: false },
      ],
      cheer: "Boom — different pieces, same space. You see the pattern. 🌟",
      hints: [
        "Imagine cutting the half into 6 little pieces. Half of 6 is... how many? 🤔",
        "Same idea as 2/4 — just smaller pieces. Three out of six covers the same half.",
      ],
      rephrase: "Different shape — if a whole splits into 6 pieces and you take 3, how much do you have?",
    },
    {
      id: 'q4',
      kind: 'count',
      prompt: "Then how many one-sixth pieces fit inside one half?",
      choices: [
        { id: 'a', label: '2 sixths', correct: false },
        { id: 'b', label: '3 sixths', correct: true  },
        { id: 'c', label: '6 sixths', correct: false },
      ],
      cheer: "Yep! 3/6 fills the same space as 1/2. 🎯",
      hints: [
        "If 1/2 = 3/6, then how many sixths are inside that half? Peek at the fraction 👀",
        "Half of 6 little pieces is... how many pieces?",
      ],
      rephrase: "Picture cutting the half into 6 even slivers. Count them — what's the number?",
    },
    {
      id: 'q5',
      kind: 'transfer',
      prompt: "Brand-new fraction time — is 1/3 the same as 2/6?",
      choices: [
        { id: 'a', label: 'Yes — same idea! 🎯', correct: true  },
        { id: 'b', label: 'No way',              correct: false },
        { id: 'c', label: 'Maybe?',              correct: false },
      ],
      cheer: "YES! Same trick, brand-new fraction. You're flying. 🚀",
      hints: [
        "Same trick! If two fourths = one half, would two sixths = one third?",
        "Cut a third into two smaller pieces — what would each be called?",
      ],
      rephrase: "Different fraction this time — does 1/3 equal 2/6?",
    },
    {
      id: 'q6',
      kind: 'discriminate',
      prompt: "Careful — is 1/2 the same as 1/3?",
      choices: [
        { id: 'a', label: "Yes — they look equal",  correct: false },
        { id: 'b', label: "No, they're different",  correct: true  },
        { id: 'c', label: 'Not sure',               correct: false },
      ],
      cheer: "RIGHT! Half is bigger than a third — totally different sizes. 👀",
      hints: [
        "Hmm — if you split a bar into 2 pieces vs 3 pieces, are the pieces the same size? 🤔",
        "Bigger denominator means smaller pieces. One slice of 3 is smaller than one slice of 2.",
      ],
      rephrase: "Compare carefully: is one piece out of 2 the same as one piece out of 3?",
    },
    {
      id: 'q7',
      kind: 'capstone',
      prompt: "Last one! Is 4/8 the same as 1/2?",
      choices: [
        { id: 'a', label: 'Yes — half is half! 🎯', correct: true  },
        { id: 'b', label: 'No, 4/8 is more',         correct: false },
        { id: 'c', label: 'No, 1/2 is more',         correct: false },
      ],
      cheer: "PERFECT. You found another one — 4/8 = 1/2. You really get it. 🌟",
      hints: [
        "If you cut your half into 8 tiny pieces, how many would cover the half? 🤔",
        "Half of 8 is... 4. So 4 out of 8 = 1/2!",
      ],
      rephrase: "Four of eight pieces — does that equal one of two pieces?",
    },
  ];

  // ── State ──
  let currentStage = 'idle';
  let questionIdx = 0;
  let attemptsByQ = {}; // qId → number of wrong attempts

  function currentQuestion() {
    return checkQuestions[questionIdx] || null;
  }

  function attemptsFor(qId) {
    return attemptsByQ[qId] || 0;
  }

  function state() {
    const stage = currentStage;
    if (stage === 'check') {
      const q = currentQuestion();
      return {
        stage: 'check',
        cfg: stages.check, // undefined — handled by app.js via question
        question: q,
        questionIdx,
        totalQuestions: checkQuestions.length,
        attempts: q ? attemptsFor(q.id) : 0,
      };
    }
    return {
      stage,
      cfg: stages[stage],
      question: null,
      questionIdx,
      totalQuestions: checkQuestions.length,
      attempts: 0,
    };
  }

  function goTo(stageId) {
    if (!stages[stageId] && stageId !== 'check') return;
    currentStage = stageId;
  }

  // Advance from a non-check, non-win linear stage.
  function advance() {
    const next = stages[currentStage]?.next;
    if (next) currentStage = next;
  }

  // Move to the next question inside the check stage.
  // Returns true if there's another question, false if we exhausted them.
  function nextQuestion() {
    if (questionIdx < checkQuestions.length - 1) {
      questionIdx += 1;
      return true;
    }
    return false;
  }

  // Called when student answers wrong.
  function recordWrongAttempt() {
    const q = currentQuestion();
    if (!q) return;
    attemptsByQ[q.id] = (attemptsByQ[q.id] || 0) + 1;
  }

  function resetAll() {
    currentStage = 'idle';
    questionIdx = 0;
    attemptsByQ = {};
  }

  function isCheckStage() {
    return currentStage === 'check';
  }

  function correctCheerFor(qId) {
    const q = checkQuestions.find((x) => x.id === qId);
    return q?.cheer || "Yes! 🌟";
  }

  // ── Expose ──
  window.tutorScript = {
    stages,
    checkQuestions,
    state,
    goTo,
    advance,
    nextQuestion,
    currentQuestion,
    isCheckStage,
    recordWrongAttempt,
    resetAll,
    correctCheerFor,
  };
})();
