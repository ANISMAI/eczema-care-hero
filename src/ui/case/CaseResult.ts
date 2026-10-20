import Overlay, { el } from "./Overlay";
import type { CaseDefinition, CaseState } from "../../mission/types";

export interface ResultOptions {
  def: CaseDefinition;
  state: Readonly<CaseState>;
  /** XP earned for the case. */
  xp: number;
  /** Highest possible care points for this case (for the ring). */
  maxPoints: number;
  onKeepExploring: () => void;
  onEndShift: () => void;
}

/**
 * Step F, case complete (brief section 04): the patient says thank you, then a short summary of
 * care points, XP and what was learned. Local only; no leaderboard. The player chooses to keep
 * exploring or end the shift.
 */
export default class CaseResult {
  private overlay: Overlay;

  constructor(parent: HTMLElement) {
    this.overlay = new Overlay(parent, "case-result");
  }

  get isOpen(): boolean {
    return this.overlay.isOpen;
  }

  open(o: ResultOptions): void {
    const { def, state } = o;
    const total = Object.values(state.points).reduce((a, b) => a + b, 0);
    const best = state.best[def.id] ?? total;
    this.overlay.setHeader({ title: `${def.title} complete!`, avatar: def.patient.portrait, subtitle: `${def.patient.name} was helped 💜` });

    const thanks = el("div", "case-speech", def.thanks);

    const score = el("div", "result-score");
    const ring = el("div", "result-ring");
    ring.style.setProperty("--p", `${Math.round((total / o.maxPoints) * 100)}%`);
    ring.append(el("strong", "", String(total)), el("span", "", "care pts"));
    const mistakes = Object.values(state.mistakes).reduce((a, b) => a + b, 0);
    const side = el("div", "result-side");
    side.append(
      el("div", "result-stars", total >= o.maxPoints ? "⭐⭐⭐" : total >= o.maxPoints - 20 ? "⭐⭐" : "⭐"),
      el("div", "result-best", `+${o.xp} XP · Best: ${best}`),
      el("div", "result-acc", mistakes === 0 ? "Every check right first time!" : "Double-checking is part of good care 👍")
    );
    score.append(ring, side);

    const tasks = el("ul", "result-tasks");
    for (const step of def.steps) {
      const got = state.points[step.id];
      const li = el("li", step.rewarded && got === undefined ? "" : "full");
      li.append(el("span", "result-check", "✓"), el("span", "", step.task), el("strong", "", got ? `+${got}` : ""));
      tasks.appendChild(li);
    }
    if (state.points.case) {
      const li = el("li", "full");
      li.append(el("span", "result-check", "💜"), el("span", "", "Patient case completed"), el("strong", "", `+${state.points.case}`));
      tasks.appendChild(li);
    }

    const takeaway = el("div", "result-takeaway");
    takeaway.append(el("strong", "", "💡 Learning takeaway"), el("p", "", def.takeaway));

    const note = el("div", "result-note", "Care points are your main score. Event bonuses and arcade coins are counted separately. Saved on this device only.");

    // closing with ✕ / Esc counts as "Keep exploring"
    let next: () => void = o.onKeepExploring;
    const keep = el("button", "secondary-btn", "Keep exploring");
    keep.addEventListener("click", () => this.overlay.close());
    const end = el("button", "primary-btn", "End shift");
    end.addEventListener("click", () => {
      next = o.onEndShift;
      this.overlay.close();
    });

    this.overlay.body.replaceChildren(thanks, score, tasks, takeaway, note);
    this.overlay.footer.replaceChildren(keep, end);
    this.overlay.open(() => next());
  }
}
