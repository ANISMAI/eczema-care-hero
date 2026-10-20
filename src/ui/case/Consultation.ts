import Overlay, { el } from "./Overlay";
import { handSvg, toStage } from "./HandArt";
import type { CaseDefinition } from "../../mission/types";

export interface ConsultationHooks {
  def: CaseDefinition;
  /** Spot ids already inspected (saved progress). */
  inspected(): string[];
  inspect(spotId: string): void;
  /** The doctor's care plan has been read and accepted. */
  done(): void;
  onClose(): void;
}

/**
 * Step C, Consultation (brief section 04): the doctor leads. The player taps the highlighted
 * areas on the patient's hand to see a short educational note, then the doctor gives the care
 * plan. The player never diagnoses or prescribes; the plan always comes from the doctor.
 */
export default class Consultation {
  private overlay: Overlay;
  private h!: ConsultationHooks;

  constructor(parent: HTMLElement) {
    this.overlay = new Overlay(parent, "case-consult");
  }

  get isOpen(): boolean {
    return this.overlay.isOpen;
  }

  open(h: ConsultationHooks): void {
    this.h = h;
    const c = h.def.consult;
    this.overlay.setHeader({ title: "Consultation", avatar: c.portrait, subtitle: `${c.doctor} · with ${h.def.patient.name}` });
    if (h.inspected().length >= c.spots.length) this.showPlan();
    else this.showInspect();
    this.overlay.open(() => h.onClose());
  }

  close(): void {
    this.overlay.close();
  }

  private showInspect(): void {
    const c = this.h.def.consult;
    const speech = el("div", "case-speech", c.intro);
    const stage = el("div", "hand-stage consult-stage");
    stage.innerHTML = handSvg();
    const info = el("div", "spot-info");
    const count = el("div", "session-counter");
    const update = () => {
      const n = this.h.inspected().length;
      count.textContent = `${n} / ${c.spots.length} areas checked`;
    };

    for (const s of c.spots) {
      const b = el("button", "inspect-spot");
      b.style.left = `${toStage(s.x)}%`;
      b.style.top = `${toStage(s.y)}%`;
      b.setAttribute("aria-label", `Inspect: ${s.label}`);
      b.append(el("span", "found-label", s.label));
      b.classList.toggle("seen", this.h.inspected().includes(s.id));
      b.addEventListener("click", () => {
        this.h.inspect(s.id);
        b.classList.add("seen");
        stage.querySelectorAll(".inspect-spot").forEach((o) => o.classList.toggle("focus", o === b));
        info.replaceChildren(el("strong", "", `🔍 ${s.label}`), el("span", "", s.info));
        info.classList.add("show");
        update();
        if (this.h.inspected().length >= c.spots.length) next.disabled = false;
      });
      stage.append(b);
    }
    info.append(el("span", "", "Tap a glowing circle on the hand."));

    const next = el("button", "primary-btn wide", `See ${c.doctor}'s care plan`);
    next.disabled = this.h.inspected().length < c.spots.length;
    next.addEventListener("click", () => this.showPlan());
    update();

    this.overlay.body.replaceChildren(speech, stage, count, info);
    this.overlay.footer.replaceChildren(next);
  }

  private showPlan(): void {
    const c = this.h.def.consult;
    const speech = el("div", "case-speech", c.summary);
    const card = el("div", "plan-card");
    const head = el("div", "plan-head");
    const img = el("img");
    img.src = c.portrait;
    img.alt = "";
    head.append(img, el("strong", "", `Care plan · ${c.doctor}`));
    const list = el("ol");
    for (const line of c.plan) list.append(el("li", "", line));
    card.append(head, list);

    const safety = el("div", "case-feedback info");
    safety.append(el("span", "case-feedback-icon", "!"), el("span", "", c.safety));

    const ok = el("button", "primary-btn wide", this.h.def.care ? "👍  Got it, to the Care Room" : "👍  Got it, thank you");
    ok.addEventListener("click", () => {
      this.h.done();
      this.overlay.close();
    });
    this.overlay.body.replaceChildren(speech, card, safety);
    this.overlay.footer.replaceChildren(ok);
  }
}
