/* ─────────────────────────────────────────
   tutorScript.js — lesson state machine
   Fruit-themed: Pip (the apple seed) guides
   the kid through slicing an apple, then
   transfers the concept across watermelon, banana,
   and orange. Pure data + transitions —
   no DOM, no fetch.
   ───────────────────────────────────────── */
(function () {
  'use strict';

  // ── Linear stages (manipulative phase) ──
  //   idle   — Pip greets, "Slice it!" button — student sees a half-apple
  //   split  — after slice, "Squish them!" button — student sees two quarters
  //   smash  — after squish, "Tell me more!" — student sees the half-apple back + equation
  //   check  — iterates through checkQuestions[] (multi-fruit progression)
  //   win    — confetti + play again
  const stages = {
    idle: {
      pip: "Hey! I'm Pip 🍎 — an apple seed. I've got half an apple. I wonder what's hiding inside it… 👀",
      action: {
        type: 'advance',
        label: '🔪  Slice it!',
        ariaLabel: 'Slice the half-apple into two quarters',
        style: 'primary',
      },
      next: 'split',
    },
    split: {
      pip: "Whoa, two pieces! Each one is a quarter (1/4) of the apple. Hmm... do they still cover the same space as the half?",
      action: {
        type: 'advance',
        label: '🤲  Squish them together!',
        ariaLabel: 'Squish the two quarter-pieces back into a half',
        style: 'primary',
      },
      next: 'smash',
    },
    smash: {
      pip: "They fit back PERFECTLY! 1/2 of an apple = 2/4 of an apple. Same fruit, same space. 🤯",
      action: {
        type: 'advance',
        label: "Let's check what you got! ✨",
        ariaLabel: 'Continue to the check questions',
        style: 'green',
      },
      next: 'check',
    },
    win: {
      pip: "Lesson complete! 🏆 You discovered equivalent fractions — different names, same amount of fruit. 🌟",
      action: {
        type: 'reset',
        label: '🔄  Play Again!',
        ariaLabel: 'Play the lesson again from the beginning',
        style: 'primary',
      },
      next: 'idle',
    },
  };

  // ── Check-for-understanding bank ──
  // Multi-fruit progression: apple → apple → watermelon → watermelon → banana → mixed → orange.
  // Each question's `fruit` field is just an emoji indicator the chat can show.
  const checkQuestions = [
    {
      id: 'q1',
      fruit: '🍎',
      kind: 'compare',
      prompt: "Apple check 🍎 — which is bigger: 1/2 of the apple or 2/4 of the apple?",
      choices: [
        { id: 'a', label: '1/2 is bigger',         correct: false },
        { id: 'b', label: '2/4 is bigger',         correct: false },
        { id: 'c', label: "They're the same! 🎯", correct: true  },
      ],
      cheer: "YES! Same apple, same space, different name. That's the whole trick. 🎯",
      hints: [
        "Hmm — when you squished the two apple quarters together, did they fit perfectly into the half? What does that tell you? 🤔",
        "Look at the bar at the top. The red half and the two quarters cover the same space, right? So they're the…?",
      ],
      rephrase: "Stare at the fruit again. Are 1/2 and 2/4 actually the same amount, or different? 🤔",
    },
    {
      id: 'q2',
      fruit: '🍎',
      kind: 'count',
      prompt: "Nice. Still with apples 🍎 — how many quarter pieces fit inside one half of the apple?",
      choices: [
        { id: 'a', label: '1 quarter',  correct: false },
        { id: 'b', label: '2 quarters', correct: true  },
        { id: 'c', label: '4 quarters', correct: false },
      ],
      cheer: "Exactly! Two quarter-slices fit into one half. You can SEE it. 🧠",
      hints: [
        "Picture the squish you just did. Two apple pieces snapped back into one half — how many is that?",
        "One half of the apple = two quarters. So how many quarters fit inside that half? Count them 🧠",
      ],
      rephrase: "Try again — how many quarter pieces of apple stack up to one half?",
    },
    {
      id: 'q3',
      fruit: '🍉',
      kind: 'apply',
      prompt: "New fruit time! 🍉 Look at a watermelon cut into 6 wedges. Is 3/6 of the watermelon the same as 1/2?",
      choices: [
        { id: 'a', label: 'Yes — same juicy half! ✨', correct: true  },
        { id: 'b', label: 'No, totally different',     correct: false },
        { id: 'c', label: 'Not sure',                  correct: false },
      ],
      cheer: "Boom — watermelon or apple, the same trick works. You see the pattern. 🌟",
      hints: [
        "Picture half a watermelon. If the whole thing has 6 wedges, how many cover the half? 🤔",
        "Same idea as the apple — different fruit, different cut, same half. Half of 6 wedges is…?",
      ],
      rephrase: "Different fruit this time — if a watermelon has 6 wedges and you grab 3, how much is that?",
    },
    {
      id: 'q4',
      fruit: '🍉',
      kind: 'count',
      prompt: "Still watermelon 🍉 — how many of those one-sixth wedges fit inside half a watermelon?",
      choices: [
        { id: 'a', label: '2 wedges', correct: false },
        { id: 'b', label: '3 wedges', correct: true  },
        { id: 'c', label: '6 wedges', correct: false },
      ],
      cheer: "Yep! 3 wedges out of 6 = half a watermelon. 🎯",
      hints: [
        "If 1/2 of the watermelon = 3/6, then how many sixth-wedges are in that half? Peek at the fraction 👀",
        "Half of 6 watermelon wedges is… how many wedges?",
      ],
      rephrase: "Picture cutting the watermelon into 6 even wedges. Count just the half — what's that number?",
    },
    {
      id: 'q5',
      fruit: '🍌',
      kind: 'transfer',
      prompt: "Banana time 🍌 — cut one into 3 chunks. Is 1/3 of the banana the same as 2/6?",
      choices: [
        { id: 'a', label: 'Yes — same idea! 🎯', correct: true  },
        { id: 'b', label: 'No way',              correct: false },
        { id: 'c', label: 'Maybe?',              correct: false },
      ],
      cheer: "YES! Same trick, brand-new fruit. You're flying. 🚀",
      hints: [
        "Same trick! If two apple quarters = one half, would two banana sixths = one banana third?",
        "Cut each third of the banana in two — what would each tiny piece be called?",
      ],
      rephrase: "Different fruit this time — does 1/3 of a banana equal 2/6?",
    },
    {
      id: 'q6',
      fruit: '🍎🍌',
      kind: 'discriminate',
      prompt: "Careful 🍎🍌 — is 1/2 of an apple the same fraction-size as 1/3 of a banana?",
      choices: [
        { id: 'a', label: "Yes — they look equal",  correct: false },
        { id: 'b', label: "No, different sizes",    correct: true  },
        { id: 'c', label: 'Not sure',               correct: false },
      ],
      cheer: "RIGHT! 1/2 is bigger than 1/3 — different fractions, different sizes. 👀",
      hints: [
        "Hmm — if you slice a fruit into 2 pieces vs 3 pieces, are the pieces the same size? 🤔",
        "More slices means smaller slices. So a slice out of 3 is smaller than a slice out of 2.",
      ],
      rephrase: "Compare the slice sizes: is one piece out of 2 the same as one piece out of 3?",
    },
    {
      id: 'q7',
      fruit: '🍊',
      kind: 'capstone',
      prompt: "Last one! 🍊 An orange has 8 natural segments. Is 4/8 of the orange the same as 1/2?",
      choices: [
        { id: 'a', label: 'Yes — half is half! 🎯', correct: true  },
        { id: 'b', label: 'No, 4/8 is more',         correct: false },
        { id: 'c', label: 'No, 1/2 is more',         correct: false },
      ],
      cheer: "PERFECT. 4 of 8 segments = half an orange. You really get it. 🌟",
      hints: [
        "If you peel an orange and have 8 segments, how many cover half of it? 🤔",
        "Half of 8 is… 4. So 4 segments out of 8 = 1/2 the orange!",
      ],
      rephrase: "Four segments out of eight — does that equal one piece out of two?",
    },
  ];

  // ── State ──
  let currentStage = 'idle';
  let questionIdx = 0;
  let attemptsByQ = {};

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
        cfg: stages.check,
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

  function advance() {
    // The 'check' stage isn't in `stages` (it's a synthetic state that
    // iterates checkQuestions), so it has no .next to look up. When we
    // advance out of check — i.e., after the final question — go to win.
    if (currentStage === 'check') {
      currentStage = 'win';
      return;
    }
    const next = stages[currentStage]?.next;
    if (next) currentStage = next;
  }

  function nextQuestion() {
    if (questionIdx < checkQuestions.length - 1) {
      questionIdx += 1;
      return true;
    }
    return false;
  }

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
