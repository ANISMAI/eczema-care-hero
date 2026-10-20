// Phase 3 visit templates: why someone comes to the clinic, independent of who they are
// (data/patients.ts). Two kinds:
//   DOCTOR       – joins the doctor queue; the doctor calls them in (case templates in data/cases)
//   NPC_SERVICE  – routine help from Nurul or Grace; never in the doctor queue, no patience bar,
//                  no score. Background clinic life only.

export type VisitType = "DOCTOR" | "NPC_SERVICE";

/** Doctor visit templates and how often each is picked. */
export const DOCTOR_VISITS: { templateId: string; weight: number; /** only for returning patients */ returning?: boolean }[] = [
  { templateId: "case001", weight: 5 },
  { templateId: "itchy-patch", weight: 3 },
  { templateId: "follow-up", weight: 3, returning: true },
];

export interface ServiceLine {
  who: "visitor" | "nurul" | "grace";
  text: string;
}

export interface ServiceVisit {
  id: string;
  /** Shown nowhere to the player; for debugging and summaries. */
  label: string;
  /** reception: Nurul answers and they leave. pharmacy: Nurul sends them on to Grace. */
  route: "reception" | "pharmacy";
  /** Said at Reception. */
  reception: ServiceLine[];
  /** Said at the Pharmacy counter (pharmacy route only). */
  pharmacy?: ServiceLine[];
}

// Pharmacist answers stay within routine product use; nothing here is medical advice.
export const SERVICE_VISITS: ServiceVisit[] = [
  {
    id: "hours",
    label: "Opening hours",
    route: "reception",
    reception: [
      { who: "visitor", text: "What time do you close today?" },
      { who: "nurul", text: "We're open until 5 PM! 🙂" },
    ],
  },
  {
    id: "appointment",
    label: "Book an appointment",
    route: "reception",
    reception: [
      { who: "visitor", text: "Can I book a check-up for next week?" },
      { who: "nurul", text: "Sure! Tuesday at 10 AM is booked for you 📅" },
    ],
  },
  {
    id: "collect",
    label: "Collect a prepared item",
    route: "pharmacy",
    reception: [
      { who: "visitor", text: "I'm here to pick up my cream." },
      { who: "nurul", text: "It's ready! Grace has it at the Pharmacy 💊" },
    ],
    pharmacy: [
      { who: "grace", text: "Here you go. Same fragrance-free cream as before ✓" },
      { who: "visitor", text: "Thank you, Grace!" },
    ],
  },
  {
    id: "stock",
    label: "Product stock question",
    route: "pharmacy",
    reception: [
      { who: "visitor", text: "Do you have gentle soap-free cleanser?" },
      { who: "nurul", text: "Grace can check for you at the Pharmacy 🙂" },
    ],
    pharmacy: [
      { who: "grace", text: "Yes, we have it in stock. Here you are!" },
      { who: "visitor", text: "Great, thanks!" },
    ],
  },
  {
    id: "storage",
    label: "How to store a cream",
    route: "pharmacy",
    reception: [
      { who: "visitor", text: "I have a quick question about my cream." },
      { who: "nurul", text: "Grace at the Pharmacy can help with that!" },
    ],
    pharmacy: [
      { who: "visitor", text: "How should I store my moisturiser?" },
      { who: "grace", text: "Somewhere cool and dry, with the lid closed 👍" },
    ],
  },
];

export function getServiceVisit(id: string): ServiceVisit | undefined {
  return SERVICE_VISITS.find((v) => v.id === id);
}
