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

export type ToolId = "lens" | "phone" | "soap" | "water" | "towel" | "cream" | "scrub" | "scented" | "hot";

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

// ---------- Phase 5: personality dialogue ----------

/** A light expression on the patient's portrait (never used in serious cases). */
export type Reaction = "smile" | "blink" | "surprised" | "shy" | "tilt" | "thinking" | "bounce";

export interface DialogueChoice {
  id: string;
  /** What the doctor says. */
  text: string;
  /** The kind, safe answer moves the chat on; a weak one gets a gentle tip and a retry. */
  good: boolean;
  /** The patient's answer. */
  reply: string;
  reaction?: Reaction;
  /** Weak choice: why it doesn't help (corrective, never harsh). */
  feedback?: string;
  /** Good choice: line added to the case notes. */
  note?: string;
}

/** One branch point: the patient says something, the doctor picks one of 2–3 answers. */
export interface DialogueTurn {
  id: string;
  /** The patient's line before the choice (the first turn uses the visit's opening line). */
  line?: string;
  reaction?: Reaction;
  choices: DialogueChoice[];
}

/** How a visit ends (Phase 5 brief section 5). */
export type VisitOutcome = "advice" | "followup" | "care" | "referral";

/**
 * A doctor visit template (Phase 3): the case without a specific patient. Text may contain
 * `{name}`, filled in with the visiting patient's name. Any identity can come with any template.
 */
export interface CaseTemplate {
  id: string;
  title: string;
  /** Short reason shown in the doctor queue ("Dry, itchy hands"). */
  reason: string;
  /** Case file shown when the doctor calls the patient in. */
  intake: { reason: string; objective: string };
  steps: StepDef[];
  interview: {
    intro: string;
    prompts: InterviewPrompt[];
    outro: string;
    /** Phase 5: other wordings of the opening line, cycled so a returning patient varies. */
    introVariants?: string[];
    /** Phase 5: branching chat (used instead of `prompts` when present). */
    turns?: DialogueTurn[];
  };
  /** Phase 5 scenario mood: serious visits get no comedic reactions. */
  mood?: "funny" | "calm" | "serious";
  outcome?: VisitOutcome;
  /** Phase 5: short key of this visit's plan, recalled by a later follow-up. */
  planKey?: string;
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
  /** Hands-on care in the Care Room; omitted for consultation-only visits. */
  care?: CareSession;
  /** Toast when the patient has collected their items at the Pharmacy (omit: no collection). */
  collected?: string;
  thanks: string;
  takeaway: string;
}

/** A template filled in for one visiting patient. */
export interface CaseDefinition extends CaseTemplate {
  patient: { name: string; fullName: string; age: number; portrait: string };
}

/** Which visitor the current case belongs to. */
export interface CaseVisit {
  instanceId: string;
  identityId: string;
}

/** Saved progress of the current patient case. */
export interface CaseState {
  version: number;
  templateId: string;
  /** The patient being seen; null while no case is open (status AVAILABLE). */
  visit: CaseVisit | null;
  status: CaseStatus;
  /** Progress inside a step that should survive a refresh (prompts asked, spots inspected...). */
  progress: Record<string, string[]>;
  /** Wrong picks per step. */
  mistakes: Record<string, number>;
  /** Care points earned per step (and "case" for completion). */
  points: Record<string, number>;
  /** Best total per template id. */
  best: Record<string, number>;
}
