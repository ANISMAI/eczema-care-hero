import type { StepDef } from "../../mission/types";

// The step sequence shared by every doctor visit. The doctor stays in their own rooms and the
// patient comes to them: call at the Consultation desk → chat → Dr. Lim's assessment (same
// room) → [hands-on care in the Care Room, only when the plan needs it] → the patient collects
// any approved item from Grace on their own → thank-you.
//
// `{name}` and `{portrait}` are filled in with the visiting patient (data/cases/index.ts).

/** Interactable id that stands for "the patient being seen" (mapped by CaseRunner). */
export const PATIENT = "patient";

const NURUL = "assets/portraits/nurul.webp";
const DR_LIM = "assets/portraits/dr-lim.webp";
const GRACE = "assets/portraits/grace.webp";
const AMY = "assets/portraits/amy.webp";

export function doctorSteps(withCare: boolean): StepDef[] {
  const steps: StepDef[] = [
    {
      id: "call",
      kind: "call",
      requires: "AVAILABLE",
      result: "ACCEPTED",
      room: "consult",
      targets: ["consult-desk", "specialist"],
      objective: "Call {name} in at the Consultation desk",
      early: { who: "Nurul", avatar: NURUL, text: "" },
      task: "Called {name} into Consultation",
    },
    {
      id: "interview",
      kind: "interview",
      requires: "ACCEPTED",
      result: "INTERVIEWED",
      room: "consult",
      targets: [PATIENT, "specialist", "consult-desk"],
      objective: "Talk to {name} in Consultation",
      early: { who: "{name}", avatar: "{portrait}", text: "Hi! I'm waiting for my name to be called 🙂" },
      rewarded: true,
      task: "Kind, helpful questions",
    },
    {
      id: "consult",
      kind: "consult",
      requires: "INTERVIEWED",
      result: "DOCTOR_REVIEWED",
      room: "consult",
      targets: ["specialist", PATIENT, "consult-desk"],
      objective: "Look at {name}'s skin with Dr. Lim",
      early: { who: "Dr. Lim", avatar: DR_LIM, text: "Call our next patient in and have a chat first, then we'll take a look together." },
      task: "Dr. Lim's assessment",
    },
  ];
  if (withCare) {
    steps.push({
      id: "care",
      kind: "care",
      requires: "DOCTOR_REVIEWED",
      result: "CARE_COMPLETED",
      room: "care",
      targets: [PATIENT, "care-bed"],
      objective: "Wash, dry and moisturise {name}'s hands in the Care Room",
      early: { who: "Nurse Amy", avatar: AMY, text: "The bed is ready! Dr. Lim will decide on the care plan first." },
      rewarded: true,
      task: "Gentle wash, pat dry, moisturise",
    });
  }
  // automatic: the patient collects any approved item from Grace, then says thank you
  steps.push(
    {
      id: "handover",
      kind: "handover",
      requires: withCare ? "CARE_COMPLETED" : "DOCTOR_REVIEWED",
      result: "HANDOVER_DONE",
      room: "pharmacy",
      targets: [],
      objective: "",
      early: { who: "Grace", avatar: GRACE, text: "" },
      task: "Collected their item from Grace",
    },
    {
      id: "farewell",
      kind: "farewell",
      requires: "HANDOVER_DONE",
      result: "COMPLETED",
      room: "pharmacy",
      targets: [],
      objective: "",
      early: { who: "{name}", avatar: "{portrait}", text: "" },
      task: "Visit complete",
    }
  );
  return steps;
}
