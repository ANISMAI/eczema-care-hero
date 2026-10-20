import { CASES, CASE_001 } from "../data/cases/case001";
import { CASE_FLOW, type CaseDefinition, type CaseState, type CaseStatus, type StepDef } from "./types";

// Central patient-case state (revised Phase 2 brief, section 05). Every change goes through the
// guarded functions below, so a step can't be done out of order or twice, and points can't be
// farmed by reopening a panel. Progress is saved to localStorage on every change, under its own
// versioned key; the Phase 1 save is untouched.

// v3: revised brief state machine (AVAILABLE ... COMPLETED). Older progress is dropped.
const STORAGE_KEY = "eczema-care-hero-case-v3";
const OLD_KEYS = ["eczema-care-hero-case-v1", "eczema-care-hero-case-v2"];
const STATE_VERSION = 3;

function freshState(caseId: string, best: Record<string, number> = {}): CaseState {
  return { version: STATE_VERSION, caseId, status: "AVAILABLE", progress: {}, mistakes: {}, points: {}, best };
}

/** Loads saved state; anything unreadable or inconsistent falls back to a fresh case. */
function load(): CaseState {
  try {
    OLD_KEYS.forEach((k) => localStorage.removeItem(k));
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return freshState(CASE_001.id);
    const s = { ...freshState(CASE_001.id), ...JSON.parse(raw) } as CaseState;
    if (s.version !== STATE_VERSION || !CASES[s.caseId] || !CASE_FLOW.includes(s.status)) {
      return freshState(CASE_001.id, s.best ?? {});
    }
    return s;
  } catch {
    return freshState(CASE_001.id);
  }
}

export type MissionListener = (state: Readonly<CaseState>) => void;

export default class MissionController {
  private state: CaseState = load();
  private listeners: MissionListener[] = [];

  constructor() {
    // write back what was loaded, so an unreadable/inconsistent save is replaced right away
    this.commit();
  }

  get snapshot(): Readonly<CaseState> {
    return this.state;
  }

  get definition(): CaseDefinition {
    return CASES[this.state.caseId];
  }

  get status(): CaseStatus {
    return this.state.status;
  }

  /** Accepted and not yet closed. */
  get inProgress(): boolean {
    return this.state.status !== "AVAILABLE" && this.state.status !== "COMPLETED";
  }

  /** The step that is due now, or null once the case is completed. */
  get currentStep(): StepDef | null {
    return this.definition.steps.find((s) => s.requires === this.state.status) ?? null;
  }

  /** Position of the current state in the flow (0 = AVAILABLE). */
  get stage(): number {
    return CASE_FLOW.indexOf(this.state.status);
  }

  onChange(fn: MissionListener): void {
    this.listeners.push(fn);
  }

  isCurrent(stepId: string): boolean {
    return this.currentStep?.id === stepId;
  }

  /** A step that is still ahead of the current one. */
  isAhead(step: StepDef): boolean {
    return CASE_FLOW.indexOf(step.requires) > this.stage;
  }

  isDone(step: StepDef): boolean {
    return CASE_FLOW.indexOf(step.result) <= this.stage;
  }

  /** A wrong pick during the current step (no score is taken away; it only lowers that step's reward). */
  mistake(stepId: string): void {
    if (!this.isCurrent(stepId)) return;
    this.state.mistakes[stepId] = (this.state.mistakes[stepId] ?? 0) + 1;
    this.commit();
  }

  mistakesOf(stepId: string): number {
    return this.state.mistakes[stepId] ?? 0;
  }

  /** Records progress inside the current step (e.g. a prompt asked). Idempotent. */
  addProgress(stepId: string, value: string): void {
    if (!this.isCurrent(stepId)) return;
    const list = (this.state.progress[stepId] ??= []);
    if (list.includes(value)) return;
    list.push(value);
    this.commit();
  }

  progressOf(stepId: string): string[] {
    return this.state.progress[stepId] ?? [];
  }

  /**
   * Completes the current step and moves to its result state. Guarded: returns false (and
   * changes nothing) if `stepId` isn't the step that is due, so nothing can be skipped,
   * repeated or rewarded twice. `points` are the care points earned by the step.
   */
  advance(stepId: string, points = 0): boolean {
    const step = this.currentStep;
    if (!step || step.id !== stepId) return false;
    if (points) this.state.points[stepId] = points;
    this.state.status = step.result;
    this.commit();
    return true;
  }

  /** Records the completion reward and updates the best total. */
  recordCompletion(points: number): void {
    if (this.state.status !== "COMPLETED" || this.state.points.case) return;
    this.state.points.case = points;
    const id = this.state.caseId;
    this.state.best[id] = Math.max(this.state.best[id] ?? 0, this.totalPoints());
    this.commit();
  }

  totalPoints(): number {
    return Object.values(this.state.points).reduce((a, b) => a + b, 0);
  }

  /** A new patient arrives (next shift): fresh case data, best totals kept. */
  reset(caseId = this.state.caseId): void {
    this.state = freshState(caseId, this.state.best);
    this.commit();
  }

  private commit(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // storage unavailable: progress lasts for this session only
    }
    for (const fn of this.listeners) fn(this.state);
  }
}
