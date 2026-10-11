import type { RoomId } from "../data/rooms";

// Data-driven patient cases (Phase 2 brief, section 07).
//
// A case starts in the Care Room: the doctor calls the patient in, then a single "care
// session" panel runs one short, hands-on activity after another. Each activity is a step
// with its own score, so progress and points are tracked (and saved) per step.

export type StepKind =
  | "call" // press "Call patient": announcement, the patient walks into the Care Room
  | "history" // tap icon cards to ask the right questions
  | "inspect" // drag a magnifier over the hand to find the marked areas
  | "referral" // ask Dr. Lim, who drops by the Care Room and approves the plan
  | "wash" // lather, rinse, then pat dry (rubbing doesn't count)
  | "pick" // choose the right cream bottle
  | "squeeze" // hold to squeeze, release in the "just right" zone
  | "spread" // smooth the cream on with slow strokes
  | "aftercare" // pick the right home-care card
  | "handoff"; // patient collects her items at the Pharmacy (automatic)

export interface StepDef {
  id: string;
  kind: StepKind;
  /** Objective banner text while this step is due. */
  objective: string;
  /** Interact-button label while this step is due. */
  action: string;
  /** Icon in the session's step bar. */
  icon: string;
  room: RoomId;
  /** Interactables that start / continue this step. */
  targets: string[];
  /** Points awarded once on completion; -5 per mistake, floor 0. */
  maxScore: number;
  /** Task name on the result screen. */
  task: string;
}

/** A tappable icon card: short label, optional feedback when wrong. */
export interface IconChoice {
  icon: string;
  label: string;
  correct: boolean;
  /** Very short reason, shown when the choice is wrong (or right). */
  why: string;
}

export interface HistoryRound {
  choices: IconChoice[];
  /** Patient's short answer after the right question (icon + few words). */
  answer: { icon: string; text: string };
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
  patient: {
    name: string;
    fullName: string;
    age: number;
    portrait: string;
  };
  steps: StepDef[];
  announcement: string;
  complaint: { icons: string; text: string };
  history: HistoryRound[];
  spots: Spot[];
  referral: { doctor: string; portrait: string; approval: string };
  creams: IconChoice[];
  aftercare: { prompt: string; choices: IconChoice[] };
  goodbye: string;
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
