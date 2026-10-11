import type { RoomId } from "../data/rooms";

// Data-driven patient cases (Phase 2 brief, section 07).
//
// Dentist-Hero style: the doctor calls the patient into the Care Room, then a treatment screen
// opens straight away with a close-up of the hand and a tray of tools. Each step is done with
// one tool; the patient's face and a comfort bar react. Almost no text.

export type StepKind =
  | "call" // press "Call patient": announcement, the patient walks in
  | "inspect" // 🔍 drag the magnifier to find the marked areas
  | "referral" // 📞 one tap: Dr. Lim approves the cream
  | "wash" // 🧼 rub to lather, then 🚿 hold to rinse
  | "dry" // 🧻 pat dry (rubbing doesn't count)
  | "cream" // 🧴 hold to squeeze the right amount, then smooth it on slowly
  | "handoff"; // the patient collects her items at the Pharmacy (automatic)

export type ToolId = "lens" | "phone" | "soap" | "water" | "towel" | "cream" | "scrub" | "scented";

export interface StepDef {
  id: string;
  kind: StepKind;
  /** Objective banner text while this step is due. */
  objective: string;
  /** Tools this step uses, in order (wash = soap then water). */
  tools: ToolId[];
  room: RoomId;
  /** Interactables that start / continue this step. */
  targets: string[];
  /** Points awarded once on completion; -5 per mistake, floor 0. */
  maxScore: number;
  /** Task name on the result screen. */
  task: string;
}

export interface Tool {
  id: ToolId;
  icon: string;
  label: string;
  /** Distractor: picking it is a (small) mistake. `why` explains. */
  wrong?: boolean;
  why?: string;
}

export interface Spot {
  id: string;
  /** One or two words shown when found. */
  label: string;
  /** Position on the hand illustration (0..100 box). */
  x: number;
  y: number;
}

export interface CaseDefinition {
  id: string;
  title: string;
  patient: { name: string; fullName: string; age: number; portrait: string };
  steps: StepDef[];
  announcement: string;
  tools: Tool[];
  spots: Spot[];
  referral: { doctor: string; portrait: string; approval: string };
  takeaway: string;
}

export type CaseStatus = "idle" | "active" | "completed";

/** Saved progress for the active case (brief section 07). */
export interface CaseState {
  version: number;
  activeCaseId: string | null;
  status: CaseStatus;
  currentStep: string | null;
  completedStepIds: string[];
  /** Progress inside a step that should survive a refresh (e.g. areas already found). */
  progress: Record<string, string[]>;
  scoresByStep: Record<string, number>;
  penaltiesByStep: Record<string, number>;
  mistakes: number;
  bestScore: Record<string, number>;
  lastResult: { caseId: string; score: number; mistakes: number; finishedAt: number } | null;
}
