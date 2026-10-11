import type { CaseDefinition } from "../../mission/types";

// Case 001 — Amina, dry itchy hands (Phase 2 brief, section 03).
//
// All educational content for the case lives in this one file so it can be reviewed by a
// healthcare professional. Text is kept very short on purpose (icons + a few words).
// Rules followed (brief section 05): no diagnosis from appearance, no doses or prescription
// medicines, no brands, no "cure" claims, warning signs route to professional review, and
// eczema is never shown as dirty or contagious.

const CARE = ["patient-amina"];

export const CASE_001: CaseDefinition = {
  id: "case001",
  title: "Case 001",
  patient: {
    name: "Amina",
    fullName: "Amina binti Yusof",
    age: 30,
    portrait: "assets/portraits/amina.webp",
  },

  steps: [
    {
      id: "call",
      kind: "call",
      objective: "Go to the Care Room and call your patient",
      action: "📢 Call patient",
      icon: "📢",
      room: "care",
      targets: ["care-bed"],
      maxScore: 0,
      task: "Called the patient",
    },
    {
      id: "history",
      kind: "history",
      objective: "Talk to Amina in the Care Room",
      action: "Start care session",
      icon: "💬",
      room: "care",
      targets: CARE,
      maxScore: 30,
      task: "Asked the right questions",
    },
    {
      id: "inspect",
      kind: "inspect",
      objective: "Look at Amina's skin",
      action: "Continue session",
      icon: "🔍",
      room: "care",
      targets: CARE,
      maxScore: 20,
      task: "Inspected the skin",
    },
    {
      id: "referral",
      kind: "referral",
      objective: "Ask Dr. Lim to review",
      action: "Continue session",
      icon: "📞",
      room: "care",
      targets: CARE,
      maxScore: 0,
      task: "Dr. Lim reviewed the plan",
    },
    {
      id: "wash",
      kind: "wash",
      objective: "Wash and pat dry Amina's hands",
      action: "Continue session",
      icon: "🧼",
      room: "care",
      targets: CARE,
      maxScore: 10,
      task: "Gentle wash & pat dry",
    },
    {
      id: "pick",
      kind: "pick",
      objective: "Choose the right cream",
      action: "Continue session",
      icon: "🧴",
      room: "care",
      targets: CARE,
      maxScore: 10,
      task: "Chose the right cream",
    },
    {
      id: "squeeze",
      kind: "squeeze",
      objective: "Squeeze the right amount",
      action: "Continue session",
      icon: "👆",
      room: "care",
      targets: CARE,
      maxScore: 10,
      task: "Used the right amount",
    },
    {
      id: "spread",
      kind: "spread",
      objective: "Smooth the cream on gently",
      action: "Continue session",
      icon: "✋",
      room: "care",
      targets: CARE,
      maxScore: 10,
      task: "Applied it gently",
    },
    {
      id: "aftercare",
      kind: "aftercare",
      objective: "Give Amina her home-care tip",
      action: "Continue session",
      icon: "💜",
      room: "care",
      targets: CARE,
      maxScore: 10,
      task: "Home-care advice",
    },
    {
      id: "handoff",
      kind: "handoff",
      objective: "Amina collects her items at the Pharmacy",
      action: "",
      icon: "💊",
      room: "pharmacy",
      targets: [],
      maxScore: 0,
      task: "Pharmacy check by Grace",
    },
  ],

  announcement: "Amina binti Yusof, please proceed to the Care Room.",

  complaint: { icons: "🖐️ 💧 😣", text: "Dry & itchy, worse after washing" },

  history: [
    {
      choices: [
        { icon: "⏱️", label: "How long?", correct: true, why: "Good: duration matters" },
        { icon: "🍔", label: "Favourite food?", correct: false, why: "Not about her skin" },
        { icon: "🦠", label: "Caught it?", correct: false, why: "Eczema isn't contagious" },
      ],
      answer: { icon: "⏱️", text: "2 weeks" },
    },
    {
      choices: [
        { icon: "🧽", label: "Scrub it off?", correct: false, why: "Scrubbing irritates skin" },
        { icon: "🧴", label: "What do you use?", correct: true, why: "Good: products matter" },
        { icon: "💊", label: "Strong cream now?", correct: false, why: "The doctor decides" },
      ],
      answer: { icon: "🧼", text: "Soap + scented lotion" },
    },
    {
      choices: [
        { icon: "🚿", label: "Not clean enough?", correct: false, why: "Eczema isn't about hygiene" },
        { icon: "👪", label: "Family has it?", correct: false, why: "Check warning signs first" },
        { icon: "🌡️", label: "Fever or oozing?", correct: true, why: "Good: warning signs" },
      ],
      answer: { icon: "✅", text: "No fever, no oozing" },
    },
  ],

  spots: [
    { id: "dry", label: "Dry", x: 50, y: 30 },
    { id: "red", label: "Mild redness", x: 42, y: 58 },
    { id: "rough", label: "Rough", x: 58, y: 82 },
  ],

  referral: {
    doctor: "Dr. Lim",
    portrait: "assets/portraits/dr-lim.webp",
    approval: "Fragrance-free emollient after washing. Go ahead! ✓",
  },

  creams: [
    { icon: "🌸", label: "Scented lotion", correct: false, why: "Fragrance can irritate" },
    { icon: "🧴", label: "Fragrance-free", correct: true, why: "Gentle on dry skin" },
    { icon: "🧽", label: "Exfoliating scrub", correct: false, why: "Scrubbing irritates" },
  ],

  aftercare: {
    prompt: "What should I do at home?",
    choices: [
      { icon: "✨", label: "It cures it forever", correct: false, why: "No product cures eczema" },
      { icon: "🌙", label: "After washing & at bedtime. Return if worse", correct: true, why: "Clear & safe" },
      { icon: "🌸", label: "Any scented lotion", correct: false, why: "Fragrance can irritate" },
    ],
  },

  goodbye: "Thank you, doctor! 💜",

  takeaway:
    "Gentle washing, patting dry and a fragrance-free moisturiser help many people with dry skin. Eczema differs for everyone, so follow a clinician's advice.",
};

export const CASES: Record<string, CaseDefinition> = { [CASE_001.id]: CASE_001 };
