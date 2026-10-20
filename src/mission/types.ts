import type { RoomId } from "../data/rooms";

// Data-driven patient cases (revised Phase 2 brief, sections 04, 05 and 09).
//
// A case is a fixed sequence of steps. Each step has a prerequisite state and the state it
// leads to, so the case walks the brief's state machine:
//   AVAILABLE → ACCEPTED → INTERVIEWED → DOCTOR_REVIEWED → CARE_COMPLETED → HANDOVER_DONE → COMPLETED

export type CaseStatus =
  | "AVAILABLE"
  | "ACCEPTED"
  | "INTERVIEWED"
  | "DOCTOR_REVIEWED"
  | "CARE_COMPLETED"
  | "HANDOVER_DONE"
  | "COMPLETED";

export const CASE_FLOW: CaseStatus[] = [
  "AVAILABLE",
  "ACCEPTED",
  "INTERVIEWED",
  "DOCTOR_REVIEWED",
  "CARE_COMPLETED",
  "HANDOVER_DONE",
  "COMPLETED",
];

export type StepKind =
  | "call" // Consultation desk: call the registered patient in (she walks there herself)
  | "interview" // Consultation: a short chat with the patient
  | "consult" // Consultation: the doctor assesses, the player inspects highlighted areas
  | "care" // Care Room: hands-on care as directed by the care plan (Treatment screen)
  | "handover" // automatic: the patient collects her items from the pharmacist on her own
  | "farewell"; // automatic: the patient says thank you; case closes

export interface StepDef {
  id: string;
  kind: StepKind;
  /** State the case must be in for this step to be due. */
  requires: CaseStatus;
  /** State the case moves to when the step is done. */
  result: CaseStatus;
  room: RoomId;
  /** Interactables that start this step (first one is where "Go" walks to); empty = automatic. */
  targets: string[];
  /** Objective banner text while this step is due. */
  objective: string;
  /** Friendly hint when the player tries this step too early: who says it and what. */
  early: { who: string; avatar: string; text: string };
  /** Care points for doing this interaction (see REWARDS.correctCare); omit for none. */
  rewarded?: boolean;
  /** Task name on the result screen. */
  task: string;
}

// ---------- Care Room (Treatment screen) ----------

export type ToolId = "lens" | "phone" | "soap" | "water" | "towel" | "cream" | "scrub" | "scented";

/** One activity inside the Treatment screen. Its id is its kind. */
export interface TreatStep {
  id: "inspect" | "referral" | "wash" | "dry" | "cream";
  tools: ToolId[];
}

export interface Tool {
  id: ToolId;
  icon: string;
  label: string;
  /** Distractor: picking it counts as a wrong pick. `why` explains. */
  wrong?: boolean;
  why?: string;
}

export interface Spot {
  id: string;
  /** One or two words shown on the hand. */
  label: string;
  /** Short educational line shown when the spot is inspected. */
  info: string;
  /** Position on the hand illustration (0..100 box). */
  x: number;
  y: number;
}

export interface CareSession {
  steps: TreatStep[];
  tools: Tool[];
  spots: Spot[];
  referral?: { doctor: string; portrait: string; approval: string };
}

// ---------- Interview and consultation ----------

export interface InterviewPrompt {
  id: string;
  question: string;
  answer: string;
  /** Line added to the case notes. */
  note: string;
}

export interface CaseDefinition {
  id: string;
  title: string;
  patient: { name: string; fullName: string; age: number; portrait: string };
  /** Case file shown when the doctor calls the patient in. */
  intake: { reason: string; objective: string };
  steps: StepDef[];
  interview: { intro: string; prompts: InterviewPrompt[]; outro: string };
  consult: {
    doctor: string;
    portrait: string;
    intro: string;
    spots: Spot[];
    /** The doctor's assessment, said before the plan. */
    summary: string;
    plan: string[];
    /** When to seek help again (referral / escalation messaging). */
    safety: string;
  };
  care: CareSession;
  /** Toast when the patient has collected her items at the Pharmacy. */
  collected: string;
  thanks: string;
  takeaway: string;
}

/** Saved progress of the current patient case. */
export interface CaseState {
  version: number;
  caseId: string;
  status: CaseStatus;
  /** Progress inside a step that should survive a refresh (prompts asked, spots inspected...). */
  progress: Record<string, string[]>;
  /** Wrong picks per step. */
  mistakes: Record<string, number>;
  /** Care points earned per step (and "case" for completion). */
  points: Record<string, number>;
  /** Best total per case id. */
  best: Record<string, number>;
}
