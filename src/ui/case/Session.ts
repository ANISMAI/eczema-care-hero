import Overlay, { el } from "./Overlay";
import type { CaseDefinition, StepDef } from "../../mission/types";

/** What an activity can do inside the session panel. */
export interface ActivityContext {
  def: CaseDefinition;
  step: StepDef;
  /** Area the activity draws into (cleared between steps). */
  stage: HTMLElement;
  /** Optional buttons under the stage (cleared between steps). */
  footer: HTMLElement;
  /** One short instruction line (a few words). */
  hint(text: string): void;
  /** Short feedback pill. */
  flash(text: string, tone: "good" | "bad"): void;
  /** -5 on the current step (floor 0). */
  penalize(): void;
  /** Progress that survives closing the panel or a refresh. */
  progress: string[];
  addProgress(value: string): void;
  /** Step finished: the session moves to the next one. */
  done(): void;
  /** Referral step: hand control to the Dr. Lim visit. */
  callDoctor(): void;
}

/** An activity renders into ctx.stage and returns an optional cleanup function. */
export type Activity = (ctx: ActivityContext) => void | (() => void);

/**
 * The care session panel: one short hands-on activity after another, with a row of step icons
 * on top. Closing it pauses the session; interacting with the patient resumes at the same step.
 */
export default class Session {
  private overlay: Overlay;
  private bar: HTMLDivElement;
  private hintEl: HTMLDivElement;
  private stage: HTMLDivElement;
  private flashEl: HTMLDivElement;
  private footer: HTMLDivElement;
  private cleanup: (() => void) | null = null;
  private flashTimer = 0;

  constructor(parent: HTMLElement) {
    this.overlay = new Overlay(parent, "case-session");
    this.bar = el("div", "session-bar");
    this.hintEl = el("div", "session-hint");
    this.stage = el("div", "session-stage");
    this.flashEl = el("div", "session-flash");
    this.footer = el("div", "session-footer");
    this.overlay.body.append(this.bar, this.hintEl, this.stage, this.flashEl);
    this.overlay.footer.appendChild(this.footer);
  }

  get isOpen(): boolean {
    return this.overlay.isOpen;
  }

  open(def: CaseDefinition, onClose: () => void): void {
    this.overlay.setHeader({ title: "Care Session", avatar: def.patient.portrait, subtitle: `${def.patient.fullName} · Care Room` });
    this.overlay.open(() => {
      this.stop();
      onClose();
    });
  }

  close(): void {
    this.overlay.close();
  }

  /** Runs one step's activity. `steps` are the session steps, for the icon bar. */
  run(steps: StepDef[], current: StepDef, doneIds: string[], activity: Activity, ctx: Omit<ActivityContext, "stage" | "footer" | "hint" | "flash">): void {
    this.stop();
    this.bar.replaceChildren(
      ...steps.map((s) => {
        const dot = el("span", "session-dot", s.icon);
        dot.title = s.task;
        if (doneIds.includes(s.id)) dot.classList.add("done");
        if (s.id === current.id) dot.classList.add("now");
        return dot;
      })
    );
    this.stage.replaceChildren();
    this.stage.className = `session-stage stage-${current.kind}`;
    this.footer.replaceChildren();
    this.flashEl.replaceChildren();
    this.hintEl.textContent = "";
    const full: ActivityContext = {
      ...ctx,
      stage: this.stage,
      footer: this.footer,
      hint: (t) => (this.hintEl.textContent = t),
      flash: (t, tone) => this.flash(t, tone),
    };
    this.cleanup = activity(full) || null;
  }

  private flash(text: string, tone: "good" | "bad"): void {
    const pill = el("span", `session-pill ${tone}`, `${tone === "good" ? "✓" : "!"}  ${text}`);
    this.flashEl.replaceChildren(pill);
    window.clearTimeout(this.flashTimer);
    this.flashTimer = window.setTimeout(() => pill.classList.add("fade"), 1800);
  }

  private stop(): void {
    this.cleanup?.();
    this.cleanup = null;
  }
}
