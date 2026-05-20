/* ─────────────────────────────────────────
   tutorScript.js — multi-lesson state machine

   Three lessons, each with the same shape
   (explore → instruct → check → win):
     equivalence — 1/2 = 2/4 (slice + squish)
     comparing   — which is bigger? (more pieces = smaller)
     adding      — 1/4 + 1/4 = 2/4 (combine)

   Pip (the apple seed) hosts all three. Pure
   data + transitions — no DOM, no fetch.

   Each linear stage may declare:
     manip   — manipulative method to call on its button press
   Each lesson declares:
     manipInit — how the manipulative initialises at idle
   ───────────────────────────────────────── */
(function () {
  'use strict';

  const LESSONS = {
    // ════════════════════════════════════════
    // LESSON 1 — Equivalence (1/2 = 2/4)
    // ════════════════════════════════════════
    equivalence: {
      id: 'equivalence',
      title: 'Same Size, New Name',
      emoji: '🍎',
      blurb: 'Discover that 1/2 and 2/4 are the same amount of fruit.',
      manipInit: 'half',
      manipFruit: 'apple',
      stages: {
        idle: {
          pip: "Hey! I'm Pip 🍎 — an apple seed. I've got half an apple. Let's peek inside — tap the Slice it button below! 👀",
          action: { type: 'advance', label: '🔪  Slice it!', ariaLabel: 'Slice the half-apple into two quarters', style: 'primary' },
          manip: 'split',
          next: 'split',
        },
        split: {
          pip: "Whoa, two pieces! Each one is a quarter (1/4) of the apple. Let's see if they still fill the same space — tap Squish them together!",
          action: { type: 'advance', label: '🤲  Squish them together!', ariaLabel: 'Squish the two quarter-pieces back into a half', style: 'primary' },
          manip: 'smash',
          next: 'smash',
        },
        smash: {
          pip: "They fit back together perfectly! Half an apple is the same as two-quarters of an apple. Same fruit, same space! 🤯 Tap Let's check what you got!",
          action: { type: 'advance', label: "Let's check what you got! ✨", ariaLabel: 'Continue to the check questions', style: 'green' },
          next: 'check',
        },
        win: {
          pip: "Lesson complete! 🏆 You discovered equivalent fractions — different names, same amount of fruit. 🌟",
          action: { type: 'reset', label: '🔄  Play Again!', ariaLabel: 'Play this lesson again', style: 'primary' },
          next: 'idle',
        },
      },
      checkQuestions: [
        {
          id: 'q1', fruit: '🍎', kind: 'compare',
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
          id: 'q2', fruit: '🍎', kind: 'count',
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
          id: 'q3', fruit: '🍉', kind: 'apply',
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
          id: 'q4', fruit: '🍉', kind: 'count',
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
          id: 'q5', fruit: '🍌', kind: 'transfer',
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
          id: 'q6', fruit: '🍎🍌', kind: 'discriminate',
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
          id: 'q7', fruit: '🍊', kind: 'capstone',
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
      ],
    },

    // ════════════════════════════════════════
    // LESSON 2 — Comparing (which is bigger?)
    // ════════════════════════════════════════
    comparing: {
      id: 'comparing',
      title: 'Which is Bigger?',
      emoji: '⚖️',
      blurb: 'The more pieces you cut, the smaller each piece gets.',
      manipInit: 'half',
      manipFruit: 'orange',
      stages: {
        idle: {
          pip: "New puzzle! 🍊 Here's half an orange — a nice big piece. Let's cut it even smaller — tap the Cut it smaller button!",
          action: { type: 'advance', label: '🔪  Cut it smaller!', ariaLabel: 'Cut the half into a smaller quarter piece', style: 'primary' },
          manip: 'compareSizes',
          next: 'compare',
        },
        compare: {
          pip: "See it? A quarter is smaller than a half. The more pieces you cut, the smaller each piece gets! 🔍 Tap Let's check what you got!",
          action: { type: 'advance', label: "Let's check what you got! ✨", ariaLabel: 'Continue to the check questions', style: 'green' },
          next: 'check',
        },
        win: {
          pip: "Lesson complete! 🏆 You learned it: the more pieces you cut, the smaller each one gets. 🌟",
          action: { type: 'reset', label: '🔄  Play Again!', ariaLabel: 'Play this lesson again', style: 'primary' },
          next: 'idle',
        },
      },
      checkQuestions: [
        {
          id: 'c1', kind: 'compare',
          viz: { type: 'compare', fractions: ['1/2', '1/4'] },
          prompt: "Which is bigger — 1/2 of {f} or 1/4 of {f}?",
          choices: [
            { id: 'a', label: '1/2 is bigger 🎯', correct: true  },
            { id: 'b', label: '1/4 is bigger',    correct: false },
            { id: 'c', label: "They're equal",    correct: false },
          ],
          cheer: "YES! Half is bigger. Two cuts beats four cuts. 🎯",
          hints: [
            "Remember the fruit you just cut — the half was a big piece, the quarter was small. Which wins? 🤔",
            "1/2 means cut into 2. 1/4 means cut into 4. More cuts = smaller pieces.",
          ],
          rephrase: "Picture both pieces side by side. Which one is the bigger chunk?",
        },
        {
          id: 'c2', kind: 'compare',
          viz: { type: 'compare', fractions: ['1/3', '1/6'] },
          prompt: "Which is bigger — 1/3 of {f} or 1/6 of {f}?",
          choices: [
            { id: 'a', label: '1/3 is bigger 🎯', correct: true  },
            { id: 'b', label: '1/6 is bigger',    correct: false },
            { id: 'c', label: 'Not sure',         correct: false },
          ],
          cheer: "Right! Cut into 3 = bigger pieces. Cut into 6 = smaller. 🍴",
          hints: [
            "Would you rather share a treat with 2 friends or 5 friends? Fewer friends = bigger pieces! 🤔",
            "6 is more cuts than 3. More cuts means each piece is smaller.",
          ],
          rephrase: "Bigger bottom number means smaller pieces. So which wins — 1/3 or 1/6?",
        },
        {
          id: 'c3', kind: 'compare',
          viz: { type: 'compare', fractions: ['1/2', '1/3'] },
          prompt: "Trickier — which is bigger: 1/2 or 1/3?",
          choices: [
            { id: 'a', label: '1/2 is bigger 🎯', correct: true  },
            { id: 'b', label: '1/3 is bigger',    correct: false },
            { id: 'c', label: "They're equal",    correct: false },
          ],
          cheer: "Exactly! Halving gives bigger pieces than cutting in thirds. 👀",
          hints: [
            "Cut a fruit into 2 vs into 3 — which makes the chunkier piece? 🤔",
            "2 is fewer cuts than 3, so 1/2 is the bigger slice.",
          ],
          rephrase: "Fewer cuts = bigger pieces. Is 1/2 (two cuts) bigger than 1/3 (three cuts)?",
        },
        {
          id: 'c4', kind: 'concept',
          prompt: "When you cut a fruit into MORE pieces, does each piece get bigger or smaller?",
          choices: [
            { id: 'a', label: 'Bigger',          correct: false },
            { id: 'b', label: 'Smaller 🎯',      correct: true  },
            { id: 'c', label: 'Stays the same',  correct: false },
          ],
          cheer: "That's the big idea! More pieces = smaller pieces. 🧠",
          hints: [
            "Think of sharing one pizza with more and more people — does your slice grow or shrink? 🤔",
            "The same fruit split into more parts means each part is tinier.",
          ],
          rephrase: "If you keep cutting a fruit into more and more pieces, what happens to each piece's size?",
        },
        {
          id: 'c5', kind: 'capstone',
          viz: { type: 'compare', fractions: ['1/2', '1/4', '1/8'] },
          prompt: "Last one! Which is the BIGGEST single piece: 1/2, 1/4, or 1/8?",
          choices: [
            { id: 'a', label: '1/2 🎯', correct: true  },
            { id: 'b', label: '1/4',    correct: false },
            { id: 'c', label: '1/8',    correct: false },
          ],
          cheer: "PERFECT! 1/2 = fewest cuts = biggest piece. You nailed it. 🌟",
          hints: [
            "Smallest bottom number = fewest cuts = biggest piece. Which has the smallest bottom number? 🤔",
            "2 cuts vs 4 cuts vs 8 cuts — the fewest cuts gives the biggest piece.",
          ],
          rephrase: "Of 1/2, 1/4, and 1/8 — which has the fewest cuts, and so the biggest piece?",
        },
      ],
    },

    // ════════════════════════════════════════
    // LESSON 3 — Adding (1/4 + 1/4 = 2/4)
    // ════════════════════════════════════════
    adding: {
      id: 'adding',
      title: 'Adding Fractions',
      emoji: '➕',
      blurb: 'Put pieces together: 1/4 + 1/4 = 2/4.',
      manipInit: 'addingStart',
      manipFruit: 'watermelon',
      stages: {
        idle: {
          pip: "Time to put pieces together! 🍉 Here are two quarter-pieces of watermelon. Let's push them into one — tap the Put them together button!",
          action: { type: 'advance', label: '➕  Put them together!', ariaLabel: 'Put the two quarter-pieces together', style: 'primary' },
          manip: 'addingCombine',
          next: 'combine',
        },
        combine: {
          pip: "Look — two-quarters! Count the top numbers together: 1 and 1 make 2. The bottom number stays the same. So 1/4 and 1/4 make 2/4. 🤯 Tap Let's check what you got!",
          action: { type: 'advance', label: "Let's check what you got! ✨", ariaLabel: 'Continue to the check questions', style: 'green' },
          next: 'check',
        },
        win: {
          pip: "Lesson complete! 🏆 You learned to put fractions together: count the top numbers, and keep the bottom number the same. 🌟",
          action: { type: 'reset', label: '🔄  Play Again!', ariaLabel: 'Play this lesson again', style: 'primary' },
          next: 'idle',
        },
      },
      checkQuestions: [
        {
          id: 'a1', kind: 'add',
          viz: { type: 'add', fractions: ['1/4', '1/4'], result: '2/4' },
          prompt: "What is 1/4 + 1/4?",
          choices: [
            { id: 'a', label: '2/4 🎯', correct: true  },
            { id: 'b', label: '2/8',    correct: false },
            { id: 'c', label: '1/4',    correct: false },
          ],
          cheer: "Yes! 1/4 and 1/4 make 2/4. Count the top numbers; the bottom number stays the same. 🎯",
          hints: [
            "You just pushed two quarter-pieces together — how many quarters is that now? 🤔",
            "Count the top numbers: 1 and 1 make 2. The bottom number stays 4. So…?",
          ],
          rephrase: "One quarter plus one more quarter — how many quarters total?",
        },
        {
          id: 'a2', kind: 'add',
          viz: { type: 'add', fractions: ['1/3', '1/3'], result: '2/3' },
          prompt: "What is 1/3 + 1/3?",
          choices: [
            { id: 'a', label: '2/3 🎯', correct: true  },
            { id: 'b', label: '2/6',    correct: false },
            { id: 'c', label: '1/3',    correct: false },
          ],
          cheer: "Right! 1 + 1 = 2 on top, bottom stays 3. So 2/3. 🍌",
          hints: [
            "Same rule as before — add the top numbers, keep the bottom number the same. 🤔",
            "1 third + 1 third. Tops: 1 + 1 = 2. Bottom stays 3.",
          ],
          rephrase: "One third and one more third — count the top numbers, keep the 3 on the bottom. What is it?",
        },
        {
          id: 'a3', kind: 'add',
          viz: { type: 'add', fractions: ['2/6', '1/6'], result: '3/6' },
          prompt: "What is 2/6 + 1/6?",
          choices: [
            { id: 'a', label: '3/6 🎯', correct: true  },
            { id: 'b', label: '3/12',   correct: false },
            { id: 'c', label: '2/6',    correct: false },
          ],
          cheer: "Boom! 2 + 1 = 3 on top, bottom stays 6. That's 3/6. 🎯",
          hints: [
            "Add ONLY the top numbers: 2 + 1. Does the bottom (6) change? 🤔",
            "Two sixths plus one sixth — how many sixths is that?",
          ],
          rephrase: "2 sixths and 1 more sixth — how many sixths is that?",
        },
        {
          id: 'a4', kind: 'add',
          viz: { type: 'add', fractions: ['1/5', '2/5'], result: '3/5' },
          prompt: "What is 1/5 + 2/5?",
          choices: [
            { id: 'a', label: '3/5 🎯', correct: true  },
            { id: 'b', label: '3/10',   correct: false },
            { id: 'c', label: '2/5',    correct: false },
          ],
          cheer: "Yes! 1 + 2 = 3 on top, bottom stays 5. So 3/5. 🚀",
          hints: [
            "Tops: 1 + 2. Bottom: stays 5. What do you get? 🤔",
            "One fifth plus two fifths = three fifths.",
          ],
          rephrase: "One fifth and two more fifths — count the top numbers, keep the 5. How many fifths?",
        },
        {
          id: 'a5', kind: 'concept',
          prompt: "When you put together two fractions that have the same bottom number, what stays the same?",
          choices: [
            { id: 'a', label: 'The bottom number 🎯', correct: true  },
            { id: 'b', label: 'The top number',       correct: false },
            { id: 'c', label: 'Both change',          correct: false },
          ],
          cheer: "Perfect! The bottom number stays, and you count the top numbers together. That's the whole trick! 🌟",
          hints: [
            "In every one, you counted the top numbers — but did the bottom number ever change? 🤔",
            "1/4 and 1/4 make 2/4. The bottom 4 stayed the same.",
          ],
          rephrase: "You count the top numbers together. So which number stays exactly the same — the top or the bottom?",
        },
      ],
    },
  };

  const LESSON_ORDER = ['equivalence', 'comparing', 'adding'];

  // ── Randomization helpers ──
  // Fruit-name pool for the comparing lesson's word problems. Text-only
  // flavor — the comparing aid stays apple-based (it illustrates the
  // fruit-independent concept "more pieces = smaller").
  const FRUIT_POOL = ['apple', 'banana', 'orange', 'watermelon', 'strawberry', 'pear', 'peach', 'mango'];

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function randFruit() { return FRUIT_POOL[Math.floor(Math.random() * FRUIT_POOL.length)]; }
  function withArticle(f) { return (/^[aeiou]/i.test(f) ? 'an ' : 'a ') + f; }

  // Build the per-playthrough check list for a lesson:
  //  - equivalence: SHUFFLE the order (each Q keeps its fruit+fraction)
  //  - others: fill any "{f}" prompt placeholder with a random fruit
  // Source LESSONS data is never mutated — we return fresh arrays/objects.
  function buildActiveQuestions(id) {
    const base = (LESSONS[id] && LESSONS[id].checkQuestions) || [];
    if (id === 'equivalence') return shuffle(base);
    return base.map((q) => {
      if (!q.prompt.includes('{f}')) return q;
      const f = withArticle(randFruit());
      return { ...q, prompt: q.prompt.split('{f}').join(f) };
    });
  }

  // ── State ──
  let activeLessonId = null;
  let currentStage = 'idle';
  let questionIdx = 0;
  let attemptsByQ = {};
  let activeQuestions = [];
  const completed = new Set();

  function lesson() { return activeLessonId ? LESSONS[activeLessonId] : null; }
  function stages() { return lesson()?.stages || {}; }
  function questions() { return activeQuestions; }

  function loadLesson(id) {
    if (!LESSONS[id]) return false;
    activeLessonId = id;
    currentStage = 'idle';
    questionIdx = 0;
    attemptsByQ = {};
    activeQuestions = buildActiveQuestions(id);
    return true;
  }

  function currentQuestion() {
    return questions()[questionIdx] || null;
  }

  function attemptsFor(qId) {
    return attemptsByQ[qId] || 0;
  }

  function state() {
    const stage = currentStage;
    const stg = stages();
    const qs = questions();
    if (stage === 'check') {
      const q = currentQuestion();
      return {
        lessonId: activeLessonId,
        stage: 'check',
        cfg: stg.check,
        question: q,
        questionIdx,
        totalQuestions: qs.length,
        attempts: q ? attemptsFor(q.id) : 0,
      };
    }
    return {
      lessonId: activeLessonId,
      stage,
      cfg: stg[stage],
      question: null,
      questionIdx,
      totalQuestions: qs.length,
      attempts: 0,
    };
  }

  function goTo(stageId) {
    const stg = stages();
    if (!stg[stageId] && stageId !== 'check') return;
    currentStage = stageId;
  }

  function advance() {
    // 'check' is synthetic (iterates questions), so it has no .next.
    // Advancing out of check means the final question was answered → win.
    if (currentStage === 'check') {
      currentStage = 'win';
      return;
    }
    const next = stages()[currentStage]?.next;
    if (next) currentStage = next;
  }

  function nextQuestion() {
    if (questionIdx < questions().length - 1) {
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

  function resetActiveLesson() {
    currentStage = 'idle';
    questionIdx = 0;
    attemptsByQ = {};
    // Re-shuffle / re-randomize on every Play Again so replays feel fresh.
    if (activeLessonId) activeQuestions = buildActiveQuestions(activeLessonId);
  }

  function isCheckStage() {
    return currentStage === 'check';
  }

  function correctCheerFor(qId) {
    const q = questions().find((x) => x.id === qId);
    return q?.cheer || "Yes! 🌟";
  }

  // ── Hub helpers ──
  function listLessons() {
    return LESSON_ORDER.map((id) => ({
      id,
      title: LESSONS[id].title,
      emoji: LESSONS[id].emoji,
      blurb: LESSONS[id].blurb,
      done: completed.has(id),
    }));
  }

  function markComplete(id) {
    if (LESSONS[id]) completed.add(id);
  }

  function allComplete() {
    return LESSON_ORDER.every((id) => completed.has(id));
  }

  function manipInit() {
    return lesson()?.manipInit || 'half';
  }

  function lessonFruit() {
    return lesson()?.manipFruit || 'apple';
  }

  // ── Expose ──
  window.tutorScript = {
    LESSONS,
    LESSON_ORDER,
    loadLesson,
    listLessons,
    markComplete,
    allComplete,
    manipInit,
    state,
    goTo,
    advance,
    nextQuestion,
    currentQuestion,
    isCheckStage,
    recordWrongAttempt,
    resetActiveLesson,
    correctCheerFor,
    lessonFruit,
    activeLessonId: () => activeLessonId,
    // Back-compat aliases (some callers used resetAll / checkQuestions)
    resetAll: resetActiveLesson,
    get checkQuestions() { return questions(); },
  };
})();
