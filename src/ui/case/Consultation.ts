import { play } from "../../game/audio";
import Overlay, { el } from "./Overlay";
import { handSvg, nearestSign, toStage } from "./HandArt";
import { OUTCOME_LABEL, UI } from "../../data/phase5/personalities";
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
 * Step C, Consultation (brief section 04): the doctor leads. Healthy skin is shown beside the
 * patient's hand, and the player spots and taps the differences (nothing is marked), each with a
 * short educational note; then the doctor gives the care plan. The player never diagnoses or
 * prescribes; the plan always comes from the doctor.
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
    // only the signs this visit talks about are drawn on the patient's hand
    const only = [...new Set(c.spots.map((sp) => nearestSign(sp.x, sp.y)))];
    const compare = el("div", "compare");
    const healthy = el("div", "compare-side healthy");
    const healthyStage = el("div", "hand-stage");
    healthyStage.innerHTML = handSvg({ signs: false });
    healthy.append(healthyStage, el("span", "compare-label", "✨ Healthy skin"));
    const theirs = el("div", "compare-side");
    const stage = el("div", "hand-stage consult-stage");
    stage.innerHTML = handSvg({ only });
    theirs.append(stage, el("span", "compare-label", `${this.h.def.patient.name}'s hand`));
    compare.append(healthy, theirs);
    const info = el("div", "spot-info");
    const count = el("div", "session-counter");
    const update = () => {
      const n = this.h.inspected().length;
      count.textContent = `${n} / ${c.spots.length} differences found`;
    };

    // a tap that isn't near a difference: a small "nothing here" ring
    stage.addEventListener("click", (e) => {
      if ((e.target as HTMLElement).closest(".inspect-spot")) return;
      const r = stage.getBoundingClientRect();
      play("gentle");
      const miss = el("span", "miss-ring");
      miss.style.left = `${((e.clientX - r.left) / r.width) * 100}%`;
      miss.style.top = `${((e.clientY - r.top) / r.height) * 100}%`;
      stage.append(miss);
      window.setTimeout(() => miss.remove(), 700);
      info.classList.remove("show");
      info.replaceChildren(el("span", "", "That part looks the same as healthy skin. Look again!"));
    });

    for (const s of c.spots) {
      const b = el("button", "inspect-spot hidden-spot");
      b.dataset.audio = "own";
      b.style.left = `${toStage(s.x)}%`;
      b.style.top = `${toStage(s.y)}%`;
      b.setAttribute("aria-label", `Inspect: ${s.label}`);
      b.append(el("span", "found-label", s.label));
      b.classList.toggle("seen", this.h.inspected().includes(s.id));
      b.addEventListener("click", () => {
        if (!this.h.inspected().includes(s.id)) play("good");
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
    info.append(el("span", "", "Compare the two hands, then tap what looks different."));

    const next = el("button", "primary-btn wide", `See ${c.doctor}'s care plan`);
    next.disabled = this.h.inspected().length < c.spots.length;
    next.addEventListener("click", () => this.showPlan());
    update();

    this.overlay.body.replaceChildren(speech, compare, count, info);
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
    // Phase 5: how this visit ends (advice only, follow-up, care, or doctor review / referral)
    const outcome = this.h.def.outcome;
    const badge = outcome ? [el("span", `plan-outcome ${outcome}`, `${UI.outcome}: ${OUTCOME_LABEL[outcome]}`)] : [];
    this.overlay.body.replaceChildren(speech, ...badge, card, safety);
    this.overlay.footer.replaceChildren(ok);
  }
}
