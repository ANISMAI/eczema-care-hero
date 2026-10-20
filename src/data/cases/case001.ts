import type { CaseDefinition } from "../../mission/types";

// Case #001 — Amina, dry itchy hands (revised Phase 2 brief, section 04).
//
// All educational content for the case lives in this one file so it can be reviewed by a
// healthcare professional. Rules followed (brief section 10): fictional patient and products,
// no diagnosis by the player, no doses or prescription medicines, no "cure" claims, the doctor
// decides the care plan, the pharmacist approves the item, and there is clear advice on when to
// seek help again. Eczema is never shown as dirty or contagious.

const AMINA = "patient-amina";
const NURUL = "assets/portraits/nurul.webp";
const DR_LIM = "assets/portraits/dr-lim.webp";
const GRACE = "assets/portraits/grace.webp";
const AMINA_FACE = "assets/portraits/amina.webp";

export const CASE_001: CaseDefinition = {
  id: "case001",
  title: "Case #001",
  patient: { name: "Amina", fullName: "Amina binti Yusof", age: 30, portrait: AMINA_FACE },
  intake: {
    reason: "Dry, itchy skin on the back of her hands",
    objective: "Call her in, listen to her, and help with Dr. Lim's care plan.",
  },

  // The doctor stays in their own rooms; the patient comes to them. Nurul registers the patient
  // at Reception, the doctor calls her into Consultation, and she collects her items from Grace
  // at the Pharmacy on her own.
  steps: [
    {
      id: "call",
      kind: "call",
      requires: "AVAILABLE",
      result: "ACCEPTED",
      room: "consult",
      targets: ["consult-desk", "specialist"],
      objective: "Go to Consultation and call your patient in",
      early: { who: "Nurul", avatar: NURUL, text: "" },
      task: "Called Amina into Consultation",
    },
    {
      id: "interview",
      kind: "interview",
      requires: "ACCEPTED",
      result: "INTERVIEWED",
      room: "consult",
      targets: [AMINA, "specialist", "consult-desk"],
      objective: "Talk to Amina in Consultation",
      early: { who: "Amina", avatar: AMINA_FACE, text: "Hi! I'm waiting for my name to be called 🙂" },
      task: "Listened to Amina",
    },
    {
      id: "consult",
      kind: "consult",
      requires: "INTERVIEWED",
      result: "DOCTOR_REVIEWED",
      room: "consult",
      targets: ["specialist", AMINA, "consult-desk"],
      objective: "Look at Amina's skin with Dr. Lim",
      early: { who: "Dr. Lim", avatar: DR_LIM, text: "Call our patient in and have a chat first, then we'll take a look together." },
      task: "Dr. Lim's assessment",
    },
    {
      id: "care",
      kind: "care",
      requires: "DOCTOR_REVIEWED",
      result: "CARE_COMPLETED",
      room: "care",
      targets: [AMINA, "care-bed"],
      objective: "Apply moisturiser to Amina's hands in the Care Room",
      early: { who: "Nurse Amy", avatar: "assets/portraits/amy.webp", text: "The bed is ready! Dr. Lim will decide on the care plan first." },
      rewarded: true,
      task: "Moisturiser, slow and gentle",
    },
    // automatic: Amina walks to the Pharmacy herself and Grace hands over her cream
    {
      id: "handover",
      kind: "handover",
      requires: "CARE_COMPLETED",
      result: "HANDOVER_DONE",
      room: "pharmacy",
      targets: [],
      objective: "",
      early: { who: "Grace", avatar: GRACE, text: "" },
      task: "Collected her cream from Grace",
    },
    {
      id: "farewell",
      kind: "farewell",
      requires: "HANDOVER_DONE",
      result: "COMPLETED",
      room: "pharmacy",
      targets: [],
      objective: "",
      early: { who: "Amina", avatar: AMINA_FACE, text: "" },
      task: "Case closed",
    },
  ],

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
        answer: "Washing up a lot at work, and the scented hand soap in our office.",
        note: "Frequent washing, scented soap",
      },
    ],
    outro: "That's everything, doctor. Could Dr. Lim take a look at my hands?",
  },

  consult: {
    doctor: "Dr. Lim",
    portrait: DR_LIM,
    intro: "Thanks for the notes! Let's look at Amina's hand together. Tap each highlighted area.",
    spots: [
      { id: "dry", label: "Dry", x: 50, y: 30, info: "Fine, flaky skin. Dry skin loses water easily, so it feels tight." },
      { id: "red", label: "Mild redness", x: 42, y: 58, info: "Slight pink patch from irritation and scratching. No swelling or oozing." },
      { id: "rough", label: "Rough", x: 58, y: 82, info: "A rough, slightly thicker area where the skin has been rubbed a lot." },
    ],
    summary: "Dry, irritated skin, and no warning signs today. Here's my plan for Amina:",
    plan: [
      "Fragrance-free moisturiser on the dry areas, applied slowly and gently. Let's start in the Care Room now.",
      "Pharmacy: Grace will hand over a fragrance-free cream for home use.",
      "Use a gentle, unscented soap and pat hands dry.",
    ],
    safety: "Come back to the clinic if the skin oozes, spreads quickly, becomes painful, or if there's a fever.",
  },

  care: {
    steps: [{ id: "cream", tools: ["cream"] }],
    tools: [
      { id: "cream", icon: "🧴", label: "Fragrance-free" },
      { id: "scented", icon: "🌸", label: "Scented lotion", wrong: true, why: "Fragrance can irritate" },
      { id: "scrub", icon: "🧽", label: "Scrub", wrong: true, why: "Scrubbing irritates dry skin" },
    ],
    spots: [],
  },

  collected: "💊  Grace handed Amina her fragrance-free cream ✓",

  thanks: "Thank you so much, doctor! My hands already feel more comfortable. I'll keep moisturising like you showed me 💜",
  takeaway:
    "Moisturise gently with a fragrance-free product, use mild soap and pat dry. Eczema is different for everyone and improves gradually with care, so follow a clinician's plan and get checked if it oozes, spreads or there's a fever.",
};

export const CASES: Record<string, CaseDefinition> = { [CASE_001.id]: CASE_001 };
