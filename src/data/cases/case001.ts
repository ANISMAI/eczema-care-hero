import type { CaseDefinition } from "../../mission/types";

// Case 001 — Amina, dry itchy hands (Phase 2 brief, section 03).
//
// All educational content for the case lives in this one file so it can be reviewed by a
// healthcare professional. Rules followed (brief section 05): no diagnosis from appearance,
// no doses or prescription medicines, no brands, no "cure" claims, the specialist decides on
// treatment, and eczema is never shown as dirty or contagious.

const AMINA = ["patient-amina"];

export const CASE_001: CaseDefinition = {
  id: "case001",
  title: "Case 001",
  patient: { name: "Amina", fullName: "Amina binti Yusof", age: 30, portrait: "assets/portraits/amina.webp" },

  steps: [
    {
      id: "call",
      kind: "call",
      objective: "Go to the Care Room and call your patient",
      tools: [],
      room: "care",
      targets: ["care-bed"],
      maxScore: 0,
      task: "Called the patient",
    },
    {
      id: "inspect",
      kind: "inspect",
      objective: "Treat Amina's hands",
      tools: ["lens"],
      room: "care",
      targets: AMINA,
      maxScore: 20,
      task: "Looked closely at the skin",
    },
    {
      id: "referral",
      kind: "referral",
      objective: "Treat Amina's hands",
      tools: ["phone"],
      room: "care",
      targets: AMINA,
      maxScore: 10,
      task: "Checked with Dr. Lim",
    },
    {
      id: "wash",
      kind: "wash",
      objective: "Treat Amina's hands",
      tools: ["soap", "water"],
      room: "care",
      targets: AMINA,
      maxScore: 20,
      task: "Gentle wash, lukewarm rinse",
    },
    {
      id: "dry",
      kind: "dry",
      objective: "Treat Amina's hands",
      tools: ["towel"],
      room: "care",
      targets: AMINA,
      maxScore: 20,
      task: "Patted dry (no rubbing)",
    },
    {
      id: "cream",
      kind: "cream",
      objective: "Treat Amina's hands",
      tools: ["cream"],
      room: "care",
      targets: AMINA,
      maxScore: 30,
      task: "Fragrance-free moisturiser, gently",
    },
    {
      id: "handoff",
      kind: "handoff",
      objective: "Amina collects her items at the Pharmacy",
      tools: [],
      room: "pharmacy",
      targets: [],
      maxScore: 0,
      task: "Pharmacy check by Grace",
    },
  ],

  announcement: "Amina binti Yusof, please proceed to the Care Room.",

  tools: [
    { id: "lens", icon: "🔍", label: "Look" },
    { id: "phone", icon: "📞", label: "Dr. Lim" },
    { id: "soap", icon: "🧼", label: "Gentle soap" },
    { id: "water", icon: "🚿", label: "Lukewarm water" },
    { id: "towel", icon: "🧻", label: "Soft towel" },
    { id: "cream", icon: "🧴", label: "Fragrance-free" },
    { id: "scrub", icon: "🧽", label: "Scrub", wrong: true, why: "Scrubbing irritates dry skin" },
    { id: "scented", icon: "🌸", label: "Scented lotion", wrong: true, why: "Fragrance can irritate" },
  ],

  spots: [
    { id: "dry", label: "Dry", x: 50, y: 30 },
    { id: "red", label: "Mild redness", x: 42, y: 58 },
    { id: "rough", label: "Rough", x: 58, y: 82 },
  ],

  referral: {
    doctor: "Dr. Lim",
    portrait: "assets/portraits/dr-lim.webp",
    approval: "Fragrance-free moisturiser ✓",
  },

  takeaway:
    "Wash gently, pat dry and use a fragrance-free moisturiser. Eczema differs for everyone, so follow a clinician's advice, and see a doctor if it spreads, oozes or there's a fever.",
};

export const CASES: Record<string, CaseDefinition> = { [CASE_001.id]: CASE_001 };
