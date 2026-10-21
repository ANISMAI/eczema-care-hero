import IncidentPanel from "./IncidentPanel";
import { el } from "../case/Overlay";
import { COMEDY } from "../../data/gameplay";
import { t } from "../../game/i18n";
import type { EventOutcome, EventRewards } from "../../events/types";

// Tiny friendly vector art: kept in code, with no bitmap or external asset dependency.
const VISITOR = `<svg viewBox="0 0 80 80" aria-hidden="true"><g stroke="#62432f" stroke-width="3" stroke-linecap="round" fill="none"><path d="M26 37 14 30m13 15-15 2m18 6-13 9m37-25 12-7m-13 15 15 2m-18 6 13 9M34 25 26 10m20 15 8-15"/></g><ellipse cx="40" cy="46" rx="17" ry="23" fill="#b98758" stroke="#62432f" stroke-width="3"/><path d="M40 29v34" stroke="#e3bc88" stroke-width="2"/><circle cx="40" cy="29" r="12" fill="#d4aa76" stroke="#62432f" stroke-width="3"/><g fill="#27354a"><circle cx="36" cy="27" r="2.5"/><circle cx="45" cy="27" r="2.5"/></g><path d="M36 33q4 4 8 0" fill="none" stroke="#62432f" stroke-width="2"/></svg>`;

export default class CockroachPanel extends IncidentPanel {
  constructor(parent: HTMLElement) { super(parent, "cockroach-panel"); }

  open(seed: number, rewards: EventRewards, done: (outcome: EventOutcome) => void, occurrence = 1): void {
    this.begin({ title: t("roach.title"), avatar: "assets/portraits/amy.webp", subtitle: t("roach.from") }, rewards, done);
    let taps = 0;
    let ready = true;
    let hop = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const story = el("div", "case-speech", t(occurrence > 1 ? "roach.introRepeat" : "roach.intro"));
    const instruction = el("p", "incident-instruction", t("roach.instructions"));
    const stage = el("div", "incident-stage roach-stage");
    stage.append(el("span", "incident-coffee", "☕"), el("span", "roach-exit", t("roach.exit")));
    const visitor = el("button", "roach-visitor");
    visitor.innerHTML = VISITOR;
    visitor.setAttribute("aria-label", t("roach.tap"));
    const progress = el("div", "incident-progress");
    progress.setAttribute("role", "status");
    const move = () => {
      visitor.style.left = `${12 + taps * 13}%`;
      visitor.style.top = `${20 + ((seed + hop++ * 17) % 30)}%`;
    };
    const render = () => {
      progress.textContent = t("incident.progress", { n: taps, total: COMEDY.cockroachTaps });
      visitor.classList.toggle("resting", !ready);
      visitor.setAttribute("aria-disabled", String(!ready));
      instruction.textContent = t(ready ? "roach.instructions" : "roach.guiding");
    };
    visitor.addEventListener("click", () => {
      if (!ready || taps >= COMEDY.cockroachTaps) return;
      ready = false;
      taps++;
      render();
      if (taps === COMEDY.cockroachTaps) {
        visitor.classList.add("roach-leaving");
        this.after(() => this.success(t(occurrence > 1 ? "roach.successRepeat" : "roach.success")), reduced ? 0 : 550);
      } else {
        move();
        this.after(() => { ready = true; render(); }, COMEDY.cockroachTapCooldownMs);
      }
    });
    if (!reduced) this.every(() => { if (ready) move(); }, COMEDY.cockroachMoveMs);
    move();
    render();
    stage.append(visitor);
    const play = el("div", "incident-play");
    play.append(stage, progress);
    const copy = el("div", "incident-copy");
    copy.append(story, instruction, el("small", "incident-hint", t("incident.hint")));
    this.overlay.body.replaceChildren(copy, play);
  }
}
