# Speaking Narrative — Fraction Fruit Lab

A flowing script you can speak through for the demo (live or recorded). Written to be *said out loud*, not read off a slide. Roughly 3–4 minutes at a natural pace. Trim the bracketed asides if you need it tighter for a 1–2 minute cut.

> Pair this with the beat-by-beat timing in [demo-script.md](demo-script.md) and the one-liners in [talking-points.md](talking-points.md). Run `npm run preflight` before recording.

---

## The narrative

**[Open — the problem]**

"Synthesis Tutor proved something powerful: when you pair a friendly conversational tutor with a hands-on digital manipulative, math stops feeling like homework and starts feeling like play. My goal for this week was to capture that magic in a working prototype — and I built **Fraction Fruit Lab**."

**[What it is]**

"It's an iPad-first web app where a tutor named **Pip — an apple seed** — guides a 9-year-old through fractions using fruit they can slice, squish, and put back together. From a simple home screen, the kid picks one of three lessons and a cartoon buddy to cheer them on."

**[Lesson 1 — the core discovery]**

"Let's play the first lesson — *Same Size, New Name*. Pip greets the kid and says, 'I've got half an apple — let's peek inside. Tap Slice it.'

*(tap Slice)* The half-apple splits into two quarter-pieces, with a little chime.

*(tap Squish them together)* They squish back into the same half — and the equation appears: one-half equals two-fourths. That's the **aha moment**. Notice Pip names the idea *after* the kid's hands have already felt it — discovery first, vocabulary second."

**[The check — and the pedagogy]**

"Then comes the check-for-understanding. And here's the part I'm proudest of: the questions move across **different fruits** — apple, watermelon, banana, orange. A watermelon naturally cuts into six wedges, an orange into eight segments. By asking 'is three-sixths the same as one-half?' on a watermelon, the kid learns that equivalence is a property of *the math* — not the apple. The fruit changes; the truth doesn't."

**[The tutor — scripted, with a careful AI assist]**

"The brief said the tutor dialogue should be scripted, and that you don't need a complex AI agent — so the entire lesson, every question, and all the branching is scripted, and the app runs fully without any AI.

*(tap a wrong answer on purpose)* But watch what happens on a wrong answer. Pip never says 'wrong.' She gives a warm hint that points back to what the kid just did with the fruit. That one hint is the *only* place I use AI — a single Claude call, tightly scoped, in Pip's voice. And there's a hand-written fallback for every question, so if the network's down, nothing breaks. I respected the constraint, and layered AI in cleanly on top."

**[Lessons 2 and 3]**

"The other two lessons reuse the same explore-then-check rhythm with their own fruit. *Which is Bigger?* uses an orange to show that more pieces means smaller pieces. *Adding Fractions* uses a watermelon — put two quarter-pieces together, and you see two-fourths appear. The language stays kid-simple: 'count the top numbers, the bottom number stays the same' — no jargon."

**[Accessibility — say this; it's a differentiator]**

"It's built to be usable by every kid. It's touch-only, so non-speaking kids have no friction. Pip's lines are narrated aloud in a friendly British voice for pre-readers. And for Deaf or hard-of-hearing kids, every sound has a visible caption — 'slice!', 'squish!', 'hooray!' — toggleable with a CC button. There's reduced-motion support and screen-reader labeling too. Sound is always an enhancement, never the only signal."

**[The buddy]**

"And because kids love a companion, they pick a buddy — Lily or Max — who cheers them on from the corner and does a little hop when they finish."

**[Tech + hosting — 30 seconds]**

"Under the hood: vanilla HTML, CSS, and JavaScript on the front end — no framework, loads instantly on an iPad. A small Node and Express server serves the app and proxies that one wrong-answer hint to Claude, keeping the API key server-side. It's deployed on **AWS Elastic Beanstalk**, with Railway as a fallback mirror. I also wrote an eval suite — twenty graded cases that check every hint stays in Pip's voice, never says 'wrong,' and references the manipulative. It passes 100% locally and in production."

**[Close]**

"That's Fraction Fruit Lab — discovery-first, fruit by fruit, with a tutor that's scripted where it should be and smart where it helps. A kid can open a URL on an iPad, with zero instructions, slice an apple, and go 'oh — they're the same!' That's the Synthesis magic, captured."

---

## If a reviewer asks…

- **"Why an LLM if the brief said scripted?"** → "The whole lesson IS scripted and runs without AI. The LLM is one optional, scoped assist for wrong-answer hints, with a scripted fallback for every question. I respected the constraint and showed I can add AI safely."
- **"Why fruit?"** → "Kids have physical intuition for cutting fruit. And switching fruits proves equivalence is about the math, not the object."
- **"Why AWS Elastic Beanstalk?"** → "Railway had an outage and AWS App Runner is closed to new customers, so I migrated to Elastic Beanstalk — managed Node hosting, free-tier for a year. Same code, reads PORT and the API key from the environment."
- **"How do you know the tutor's tone is right?"** → "An eval suite scores every hint against Pip's voice rules. 100% pass, and I can run it against the live URL anytime."
- **"What would you build next?"** → "Sliceable animations for every fruit, a real student-error dataset to tune the hints, and a teacher view of the transcript."

---

## Delivery tips

- **Lead with the aha**, not the tech. Slice + squish in the first 30 seconds.
- **Let Pip's voice play** — don't talk over the narration during the slice/squish.
- **Do the wrong-answer on purpose** — it's the most impressive 15 seconds.
- **Name the accessibility work** — most prototypes skip it; it signals care.
- Keep the architecture to ~30 seconds at the end; gesture at [ARCHITECTURE.md](ARCHITECTURE.md).
