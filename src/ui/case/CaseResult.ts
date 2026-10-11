import Overlay, { el } from "./Overlay";
import type { CaseDefinition, CaseState } from "../../mission/types";

export interface ResultOptions {
  def: CaseDefinition;
  state: Readonly<CaseState>;
  onReturn: () => void;
  onReplay: () => void;
}

/** End-of-case result screen (brief section 06). Local score only; no leaderboard. */
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
    const total = Object.values(state.scoresByStep).reduce((a, b) => a + b, 0);
    const best = state.bestScore[def.id] ?? total;
    this.overlay.setHeader({ title: `${def.title} complete!`, avatar: def.patient.portrait, subtitle: `${def.patient.name} was helped 💜` });

    const score = el("div", "result-score");
    const ring = el("div", "result-ring");
    ring.style.setProperty("--p", `${total}%`);
    ring.append(el("strong", "", String(total)), el("span", "", "/ 100"));
    const stars = total >= 90 ? "⭐⭐⭐" : total >= 70 ? "⭐⭐" : "⭐";
    const side = el("div", "result-side");
    side.append(
      el("div", "result-stars", stars),
      el("div", "result-best", `Best: ${best} / 100`),
      el("div", "result-acc", state.mistakes === 0 ? "No mistakes. Perfect accuracy!" : `${state.mistakes} wrong ${state.mistakes === 1 ? "choice" : "choices"} along the way`)
    );
    score.append(ring, side);

    const tasks = el("ul", "result-tasks");
    for (const step of def.steps) {
      if (!step.maxScore) continue;
      const got = state.scoresByStep[step.id] ?? 0;
      const li = el("li", got === step.maxScore ? "full" : "");
      li.append(el("span", "result-check", "✓"), el("span", "", step.task), el("strong", "", `${got}/${step.maxScore}`));
      tasks.appendChild(li);
    }

    const takeaway = el("div", "result-takeaway");
    takeaway.append(el("strong", "", "💡 Learning takeaway"), el("p", "", def.takeaway));

    const note = el("div", "result-note", "Prototype · Local Score (saved on this device only)");

    // closing with ✕ / Esc counts as "Return to Clinic"
    let next: () => void = o.onReturn;
    const ret = el("button", "secondary-btn", "Return to Clinic");
    ret.addEventListener("click", () => this.overlay.close());
    const replay = el("button", "primary-btn", "Replay Case");
    replay.addEventListener("click", () => {
      next = o.onReplay;
      this.overlay.close();
    });

    this.overlay.body.replaceChildren(score, tasks, takeaway, note);
    this.overlay.footer.replaceChildren(ret, replay);
    this.overlay.open(() => next());
  }
}
