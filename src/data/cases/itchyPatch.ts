import { doctorSteps } from "./steps";
import type { CaseTemplate } from "../../mission/types";

// Consultation-only visit: a mild itchy patch. Dr. Lim gives advice; no Care Room session is
// needed, so the maximum is the case reward only. Same content rules as case001.ts.

export const CASE_ITCHY_PATCH: CaseTemplate = {
  id: "itchy-patch",
  title: "Consultation · Itchy patch",
  reason: "Itchy patch, comes and goes",
  intake: {
    reason: "An itchy patch on the hand that comes and goes",
    objective: "Listen to {name} and look at the patch with Dr. Lim.",
  },

  steps: doctorSteps(false),

  interview: {
    intro: "Hello doctor. I've had an itchy patch on my hand. Is that okay to ask about?",
    prompts: [
      {
        id: "feel",
        question: "What does it feel like?",
        answer: "Itchy, and it goes a bit pink after I scratch it.",
        note: "Itchy, pink after scratching",
      },
      {
        id: "long",
        question: "How long have you had it?",
        answer: "About a week. Some days it's fine, then it comes back.",
        note: "About 1 week, comes and goes",
      },
      {
        id: "worse",
        question: "Does anything make it worse?",
        answer: "Hot days, when I get sweaty.",
        note: "Worse with heat and sweat",
      },
    ],
    outro: "That's all. Could Dr. Lim have a look, please?",
  },

  consult: {
    doctor: "Dr. Lim",
    portrait: "assets/portraits/dr-lim.webp",
    intro: "Let's have a look at the patch on {name}'s hand. Tap each highlighted area.",
    spots: [
      { id: "red", label: "Mild redness", x: 42, y: 58, info: "A small pink area. No swelling, oozing or broken skin." },
      { id: "dry", label: "Dry", x: 50, y: 30, info: "A little dryness around it. Dry skin itches more easily." },
    ],
    summary: "A mild, itchy patch with no warning signs. No Care Room session is needed today. My advice for {name}:",
    plan: [
      "Moisturise the area twice a day with a fragrance-free cream.",
      "Stay cool, wear soft breathable clothes, and try not to scratch.",
      "Grace will have a fragrance-free cream ready at the Pharmacy.",
    ],
    safety: "Come back if the patch spreads, oozes, becomes painful, or if there's a fever.",
  },

  collected: "💊  {name} picked up a fragrance-free cream from Grace ✓",

  thanks: "Thank you, doctor! That's good to know. I'll keep it moisturised and cool 🙂",
  takeaway:
    "Not every visit needs treatment in the clinic. Gentle daily moisturising, staying cool and not scratching help a lot, and a clinician should check anything that spreads, oozes or hurts.",
};
