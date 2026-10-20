import { CASE_TEMPLATES, buildCase } from "../data/cases";
import { CASE_001 } from "../data/cases/case001";
import { getPatient, PATIENTS } from "../data/patients";
import { CASE_FLOW, type CaseDefinition, type CaseState, type CaseStatus, type CaseVisit, type StepDef } from "./types";

// Central patient-case state (revised Phase 2 brief, section 05; Phase 3 adds the visitor).
// One doctor case is open at a time: the patient the doctor called in from the queue. Every
// change goes through the guarded functions below, so a step can't be done out of order or
// twice, and points can't be farmed by reopening a panel. Saved on every change under its own
// versioned key.

// v4: Phase 3 — the case belongs to a visitor; templates are separate from patients.
const STORAGE_KEY = "eczema-care-hero-case-v4";
const OLD_KEYS = ["eczema-care-hero-case-v1", "eczema-care-hero-case-v2", "eczema-care-hero-case-v3"];
const STATE_VERSION = 4;

function freshState(best: Record<string, number> = {}): CaseState {
  return { version: STATE_VERSION, templateId: CASE_001.id, visit: null, status: "AVAILABLE", progress: {}, mistakes: {}, points: {}, best };
}

/** Loads saved state; anything unreadable or inconsistent falls back to "no case open". */
function load(): CaseState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const old = OLD_KEYS.map((k) => localStorage.getItem(k)).find(Boolean);
      OLD_KEYS.forEach((k) => localStorage.removeItem(k));
      const best = old ? (JSON.parse(old).best ?? {}) : {};
      return freshState(best);
    }
    const s = { ...freshState(), ...JSON.parse(raw) } as CaseState;
    const valid =
      s.version === STATE_VERSION &&
      CASE_TEMPLATES[s.templateId] &&
      CASE_FLOW.includes(s.status) &&
      (s.visit === null ? s.status === "AVAILABLE" || s.status === "COMPLETED" : !!getPatient(s.visit.identityId));
    return valid ? s : freshState(s.best ?? {});
  } catch {
    return freshState();
  }
}

export type MissionListener = (state: Readonly<CaseState>) => void;

export default class MissionController {
  private state: CaseState = load();
  private listeners: MissionListener[] = [];
  private def: CaseDefinition;

  constructor() {
    this.def = this.build();
    // write back what was loaded, so an unreadable/inconsistent save is replaced right away
    this.commit();
  }

  private build(): CaseDefinition {
    const patient = getPatient(this.state.visit?.identityId ?? "") ?? PATIENTS[0];
    return buildCase(this.state.templateId, patient);
  }

  get snapshot(): Readonly<CaseState> {
    return this.state;
  }

  /** The open case, filled in for its patient. */
  get definition(): CaseDefinition {
    return this.def;
  }

  get visit(): CaseVisit | null {
    return this.state.visit;
  }

  get status(): CaseStatus {
    return this.state.status;
  }

  /** A patient has been called in and the case isn't closed yet. */
  get inProgress(): boolean {
    return !!this.state.visit && this.state.status !== "AVAILABLE" && this.state.status !== "COMPLETED";
  }

  /** The step that is due now, or null when no case is open or it is completed. */
  get currentStep(): StepDef | null {
    if (!this.state.visit) return null;
    return this.def.steps.find((s) => s.requires === this.state.status) ?? null;
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

  /** Opens a case for the patient the doctor just called in (only when none is open). */
  start(templateId: string, visit: CaseVisit): boolean {
    if (this.inProgress || !CASE_TEMPLATES[templateId] || !getPatient(visit.identityId)) return false;
    this.state = { ...freshState(this.state.best), templateId, visit };
    this.def = this.build();
    this.commit();
    return true;
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
    const id = this.state.templateId;
    this.state.best[id] = Math.max(this.state.best[id] ?? 0, this.totalPoints());
    this.commit();
  }

  totalPoints(): number {
    return Object.values(this.state.points).reduce((a, b) => a + b, 0);
  }

  /** Closes the case record (patient gone home, or the day ended): no case open. Best totals kept. */
  reset(): void {
    this.state = freshState(this.state.best);
    this.def = this.build();
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
