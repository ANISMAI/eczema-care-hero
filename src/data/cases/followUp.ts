import { doctorSteps } from "./steps";
import type { CaseTemplate } from "../../mission/types";

// Follow-up visit (consultation only): a returning patient whose skin is improving with
// regular moisturising. Only offered to someone who has already had a doctor visit
// (see data/visits.ts). Same content rules as case001.ts; improvement is gradual, never a cure.

export const CASE_FOLLOW_UP: CaseTemplate = {
  id: "follow-up",
  title: "Follow-up · Skin check",
  reason: "Follow-up check",
  intake: {
    reason: "Follow-up after starting a moisturising routine",
    objective: "Ask {name} how it's going and check progress with Dr. Lim.",
  },

  steps: doctorSteps(false),

  interview: {
    intro: "Hi doctor! I'm back for my check-up.",
    prompts: [
      {
        id: "routine",
        question: "Have you been moisturising?",
        answer: "Yes, twice a day, the way you showed me.",
        note: "Moisturising twice a day",
      },
      {
        id: "feel",
        question: "How does your skin feel now?",
        answer: "Much less itchy, and it doesn't feel so tight.",
        note: "Less itchy, less tight",
      },
      {
        id: "flare",
        question: "Any new irritation?",
        answer: "Only once, when I washed a lot of dishes without gloves.",
        note: "One flare after washing without gloves",
      },
    ],
    outro: "That's my update! Could Dr. Lim take a look?",
  },

  consult: {
    doctor: "Dr. Lim",
    portrait: "assets/portraits/dr-lim.webp",
    intro: "Let's compare {name}'s hand with healthy skin and see how it's going. Tap what looks different.",
    spots: [
      { id: "softer", label: "Softer", x: 50, y: 30, info: "Less flaky than before. The moisturising routine is helping." },
      { id: "dry", label: "Still a bit dry", x: 58, y: 82, info: "Some dryness remains. Skin improves gradually, so keep going." },
    ],
    summary: "Good progress, and no warning signs. Let's keep it going:",
    plan: [
      "Keep moisturising twice a day, even on days the skin feels fine.",
      "Wear gloves for washing up, then pat hands dry.",
      "Collect a refill of the same fragrance-free cream from Grace.",
    ],
    safety: "Come back sooner if it flares badly, oozes, spreads, or if there's a fever.",
  },

  collected: "💊  {name} collected a cream refill from Grace ✓",

  thanks: "Thanks, doctor! I'm so glad it's getting better. I'll keep it up 💜",
  takeaway:
    "Eczema care is ongoing: keep moisturising even on good days, avoid known triggers like long wet-work without gloves, and come back if it flares, oozes or spreads.",
};
