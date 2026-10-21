import { doctorSteps } from "./steps";
import type { CaseTemplate } from "../../mission/types";

// Case #001 — dry, itchy hands (the original Amina case; full visit with Care Room care).
//
// All educational content for a case lives in its own file so it can be reviewed by a
// healthcare professional. Rules followed (brief section 10): fictional patients and products,
// no diagnosis by the player, no doses or prescription medicines, no "cure" claims, the doctor
// decides the care plan, the pharmacist approves the item, and there is clear advice on when to
// seek help again. Eczema is never shown as dirty or contagious.
//
// `{name}` is filled in with the visiting patient's name (any identity can have this visit).

export const CASE_001: CaseTemplate = {
  id: "case001",
  title: "Case #001 · Dry hands",
  reason: "Dry, itchy hands",
  intake: {
    reason: "Dry, itchy skin on the back of the hands",
    objective: "Listen to {name}, look at the skin with Dr. Lim, and help with the care plan.",
  },

  steps: doctorSteps(true),

  interview: {
    intro: "Hi doctor! Thanks for seeing me. What would you like to know?",
    prompts: [
      {
        id: "feel",
        question: "How does your skin feel?",
        answer: "Dry and tight, and it gets really itchy, especially at night.",
        note: "Dry, tight, itchy (worse at night)",
      },
      {
        id: "long",
        question: "How long has it been like this?",
        answer: "About two weeks. It started when the weather turned cold and windy.",
        note: "About 2 weeks",
      },
      {
        id: "worse",
        question: "Does anything make it worse?",
        answer: "Washing my hands a lot, and the scented hand soap I use.",
        note: "Frequent washing, scented soap",
      },
    ],
    outro: "That's everything, doctor. Could Dr. Lim take a look at my hands?",
  },

  consult: {
    doctor: "Dr. Lim",
    portrait: "assets/portraits/dr-lim.webp",
    intro: "Thanks for the notes! Let's compare {name}'s hand with healthy skin. Tap what looks different.",
    spots: [
      { id: "dry", label: "Dry", x: 50, y: 30, info: "Fine, flaky skin. Dry skin loses water easily, so it feels tight." },
      { id: "red", label: "Mild redness", x: 42, y: 58, info: "Slight pink patch from irritation and scratching. No swelling or oozing." },
      { id: "rough", label: "Rough", x: 58, y: 82, info: "A rough, slightly thicker area where the skin has been rubbed a lot." },
    ],
    summary: "Dry, irritated skin, and no warning signs today. Here's my plan for {name}:",
    plan: [
      "In the Care Room now: a gentle soap-free wash, lukewarm rinse, pat dry, then a fragrance-free moisturiser, slowly and gently.",
      "Pharmacy: Grace will hand over a fragrance-free cream for home use.",
      "Use a gentle, unscented soap and pat hands dry.",
    ],
    safety: "Come back to the clinic if the skin oozes, spreads quickly, becomes painful, or if there's a fever.",
  },

  care: {
    // gentle wash → rinse with lukewarm water → pat dry → fragrance-free moisturiser
    steps: [
      { id: "wash", tools: ["soap", "water"] },
      { id: "dry", tools: ["towel"] },
      { id: "cream", tools: ["cream"] },
    ],
    tools: [
      { id: "soap", icon: "🫧", label: "Gentle wash" },
      { id: "water", icon: "💧", label: "Lukewarm water" },
      { id: "towel", icon: "🧻", label: "Soft towel" },
      { id: "cream", icon: "🧴", label: "Fragrance-free" },
      { id: "hot", icon: "♨️", label: "Hot water", wrong: true, why: "Hot water dries the skin. Lukewarm is kinder" },
      { id: "scented", icon: "🌸", label: "Scented lotion", wrong: true, why: "Fragrance can irritate" },
      { id: "scrub", icon: "🧽", label: "Scrub", wrong: true, why: "Scrubbing irritates dry skin" },
    ],
    spots: [],
  },

  collected: "💊  Grace handed {name} a fragrance-free cream ✓",

  thanks: "Thank you so much, doctor! My hands already feel more comfortable. I'll keep moisturising like you showed me 💜",
  takeaway:
    "Moisturise gently with a fragrance-free product, use mild soap and pat dry. Eczema is different for everyone and improves gradually with care, so follow a clinician's plan and get checked if it oozes, spreads or there's a fever.",
};
