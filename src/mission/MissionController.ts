import { CASES } from "../data/cases/case001";
import type { CaseDefinition, CaseState, StepDef } from "./types";

// Central mission state (Phase 2 brief, section 07). Every change goes through the guarded
// functions below, so steps can't be completed out of order or twice, and points can't be
// farmed by reopening a panel. Progress is saved to localStorage on every change, under its own
// versioned key; the Phase 1 save is untouched.

// v2: steps redesigned around the Care Room session; v1 progress is dropped (best scores kept).
const STORAGE_KEY = "eczema-care-hero-case-v2";
const OLD_KEY = "eczema-care-hero-case-v1";
const STATE_VERSION = 2;
export const PENALTY = 5;

function emptyState(): CaseState {
  return {
    version: STATE_VERSION,
    activeCaseId: null,
    status: "idle",
    currentStep: null,
    completedStepIds: [],
    progress: {},
    scoresByStep: {},
    penaltiesByStep: {},
    mistakes: 0,
    bestScore: {},
    lastResult: null,
  };
}

/** Loads saved state; anything unreadable or inconsistent falls back to a clean state. */
function load(): CaseState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const old = localStorage.getItem(OLD_KEY);
      localStorage.removeItem(OLD_KEY);
      const best = old ? (JSON.parse(old).bestScore ?? {}) : {};
      return { ...emptyState(), bestScore: best };
    }
    const s = { ...emptyState(), ...JSON.parse(raw) } as CaseState;
    if (s.version !== STATE_VERSION) return { ...emptyState(), bestScore: s.bestScore ?? {} };
    const def = s.activeCaseId ? CASES[s.activeCaseId] : undefined;
    if (s.status === "active") {
      const valid = def && def.steps.some((st) => st.id === s.currentStep);
      if (!valid) return { ...emptyState(), bestScore: s.bestScore ?? {} };
    }
    return s;
  } catch {
    return emptyState();
  }
}

export type MissionListener = (state: CaseState) => void;

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

  get definition(): CaseDefinition | null {
    return this.state.activeCaseId ? CASES[this.state.activeCaseId] ?? null : null;
  }

  get isActive(): boolean {
    return this.state.status === "active";
  }

  /** The step that has to be done next, or null if no case is running. */
  get currentStep(): StepDef | null {
    const def = this.definition;
    if (!def || !this.isActive) return null;
    return def.steps.find((s) => s.id === this.state.currentStep) ?? null;
  }

  onChange(fn: MissionListener): void {
    this.listeners.push(fn);
  }

  /** True only for the step that is currently due. */
  isCurrent(stepId: string): boolean {
    return this.isActive && this.state.currentStep === stepId;
  }

  isDone(stepId: string): boolean {
    return this.state.completedStepIds.includes(stepId);
  }

  /** Starts (or restarts) a case. Keeps best scores; resets only case-specific data. */
  start(caseId: string): void {
    const def = CASES[caseId];
    if (!def) return;
    this.state = {
      ...emptyState(),
      bestScore: this.state.bestScore,
      lastResult: this.state.lastResult,
      activeCaseId: caseId,
      status: "active",
      currentStep: def.steps[0].id,
    };
    this.commit();
  }

  /** A wrong choice during the current step: -5 (step score can't go below 0). */
  penalize(stepId: string): void {
    if (!this.isCurrent(stepId)) return;
    const step = this.currentStep!;
    const now = this.state.penaltiesByStep[stepId] ?? 0;
    this.state.penaltiesByStep[stepId] = Math.min(step.maxScore, now + PENALTY);
    this.state.mistakes += 1;
    this.commit();
  }

  /** Records progress inside the current step (e.g. an area found). Idempotent. */
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
   * Completes a step. Guarded: returns false (and changes nothing) if the step isn't the one
   * currently due, so a step can't be skipped, repeated or scored twice.
   */
  complete(stepId: string): boolean {
    const def = this.definition;
    const step = this.currentStep;
    if (!def || !step || step.id !== stepId || this.isDone(stepId)) return false;

    const penalty = this.state.penaltiesByStep[stepId] ?? 0;
    this.state.scoresByStep[stepId] = Math.max(0, step.maxScore - penalty);
    this.state.completedStepIds.push(stepId);

    const next = def.steps[def.steps.indexOf(step) + 1];
    if (next) {
      this.state.currentStep = next.id;
    } else {
      this.state.currentStep = null;
      this.state.status = "completed";
      const total = this.totalScore();
      this.state.bestScore[def.id] = Math.max(this.state.bestScore[def.id] ?? 0, total);
      this.state.lastResult = { caseId: def.id, score: total, mistakes: this.state.mistakes, finishedAt: Date.now() };
    }
    this.commit();
    return true;
  }

  totalScore(): number {
    return Object.values(this.state.scoresByStep).reduce((a, b) => a + b, 0);
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
