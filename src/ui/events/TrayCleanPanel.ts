import Overlay, { el, feedback } from "../case/Overlay";
import { WATER_HTML } from "../case/HandArt";
import type { EventOutcome, EventPanel, EventRewards } from "../../events/types";

const AMY = "assets/portraits/amy.webp";
const RINSE_MS = 1500;
const SMUDGES = 5;
const DROPS = 4;
const STEPS = ["🧼 Scrub", "🚿 Rinse", "🧻 Dry", "🧺 Rack"] as const;

/** Smudge / drop positions on the tray (% of the stage), varied by seed. */
function spots(seed: number, n: number, salt: number): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  let s = seed * 9301 + salt * 49297;
  for (let i = 0; i < n; i++) {
    s = (s * 9301 + 49297) % 233280;
    const a = s / 233280;
    s = (s * 9301 + 49297) % 233280;
    const b = s / 233280;
    out.push({ x: 22 + a * 56, y: 30 + b * 40 });
  }
  return out;
}

/**
 * Clean a used care tray at the Care Room sink: scrub off the cream smudges, hold to rinse, tap
 * the water drops to pat dry, then put it back on the rack. Used for the "Amy is busy" event
 * (with a reward) and when the doctor simply chooses to clean a tray (no reward).
 */
export default class TrayCleanPanel implements EventPanel {
  private overlay: Overlay;

  constructor(parent: HTMLElement) {
    this.overlay = new Overlay(parent, "event-panel tray-panel");
  }

  get isOpen(): boolean {
    return this.overlay.isOpen;
  }

  close(): void { this.overlay.close(); }

  open(seed: number, rewards: EventRewards, done: (o: EventOutcome) => void): void {
    let outcome: EventOutcome = "later";
    let step = 0;
    const timers: number[] = [];
    const isEvent = rewards.coins > 0 || rewards.xp > 0;

    this.overlay.setHeader({ title: "Clean a care tray", avatar: AMY, subtitle: isEvent ? "Nurse Amy is busy · Care Room sink" : "Care Room sink" });

    const speech = el("div", "case-speech");
    const dots = el("div", "tray-steps");
    STEPS.forEach((s) => dots.append(el("span", "", s)));

    const stage = el("div", "tray-stage");
    const tray = el("div", "tray");
    tray.append(el("span", "tray-item", "🧤"), el("span", "tray-item", "🥄"), el("span", "tray-item", "🥣"), el("span", "tray-item", "🧻"));
    stage.append(tray);
    const smudges = spots(seed, SMUDGES, 1).map((p) => {
      const m = el("span", "tray-smudge");
      m.style.left = `${p.x}%`;
      m.style.top = `${p.y}%`;
      stage.append(m);
      return m;
    });
    const drops = spots(seed, DROPS, 2).map((p) => {
      const d = el("button", "tray-drop", "💧");
      d.style.left = `${p.x}%`;
      d.style.top = `${p.y}%`;
      d.setAttribute("aria-label", "Pat this drop dry");
      d.addEventListener("click", () => {
        if (step !== 2 || d.classList.contains("gone")) return;
        d.classList.add("gone");
        if (drops.every((o) => o.classList.contains("gone"))) next();
      });
      stage.append(d);
      return d;
    });
    const water = el("div", "water");
    water.innerHTML = WATER_HTML;
    stage.append(water);
    const meter = el("div", "tray-meter");
    const fill = el("span");
    meter.append(fill);
    const note = el("div");

    const rack = el("button", "primary-btn wide", "🧺  Put it on the rack");
    rack.addEventListener("click", () => {
      outcome = "resolved";
      const ok = el("button", "primary-btn wide", "Done");
      ok.addEventListener("click", () => this.overlay.close());
      this.overlay.body.replaceChildren(
        el("div", "case-speech", isEvent ? "Thank you so much, doctor! One more clean tray ready for the next patient. 💜" : "Clean and ready for the next patient! ✨"),
        feedback(isEvent ? `Tray cleaned · +${rewards.coins} 🪙  +${rewards.xp} XP` : "Tray cleaned", "good")
      );
      this.overlay.footer.replaceChildren(ok);
    });

    const hints = [
      "Rub over the cream smudges with soapy water 🧼",
      "Hold on the tray to rinse it 🚿",
      "Tap each drop to pat it dry 🧻",
      "All clean! Put it back on the rack.",
    ];
    const render = () => {
      speech.textContent = hints[step];
      [...dots.children].forEach((d, i) => d.classList.toggle("done", i < step));
      [...dots.children].forEach((d, i) => d.classList.toggle("now", i === step));
      stage.dataset.step = String(step);
      drops.forEach((d) => d.classList.toggle("show", step === 2));
      meter.classList.toggle("hidden", step !== 1);
      rack.disabled = step !== 3;
    };
    const next = () => {
      step += 1;
      note.replaceChildren(feedback(["Sparkly clean!", "Rinsed!", "Dry!"][step - 1] ?? "", "good"));
      render();
    };

    // scrub: wipe smudges by passing over them; rinse: hold
    let down = false;
    let holdStart = 0;
    let holdTimer = 0;
    const stopHold = () => {
      window.clearInterval(holdTimer);
      holdTimer = 0;
      water.classList.remove("on");
    };
    const scrubAt = (e: PointerEvent) => {
      const r = stage.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 100;
      const y = ((e.clientY - r.top) / r.height) * 100;
      if (Math.random() < 0.35) {
        const b = el("span", "suds");
        b.style.left = `${x}%`;
        b.style.top = `${y}%`;
        b.style.setProperty("--s", `${8 + Math.random() * 10}px`);
        stage.append(b);
        timers.push(window.setTimeout(() => b.remove(), 2200));
      }
      for (const m of smudges) {
        if (m.classList.contains("gone")) continue;
        const left = parseFloat(m.style.left);
        const top = parseFloat(m.style.top);
        if (Math.hypot(left - x, top - y) < 11) {
          const wipes = Number(m.dataset.w ?? 0) + 1;
          m.dataset.w = String(wipes);
          m.style.opacity = String(Math.max(0, 1 - wipes / 6));
          if (wipes >= 6) m.classList.add("gone");
        }
      }
      if (smudges.every((m) => m.classList.contains("gone"))) next();
    };
    stage.addEventListener("pointerdown", (e) => {
      if (step === 0) {
        down = true;
        stage.setPointerCapture(e.pointerId);
        scrubAt(e);
      } else if (step === 1) {
        holdStart = performance.now();
        water.classList.add("on");
        holdTimer = window.setInterval(() => {
          const v = (performance.now() - holdStart) / RINSE_MS;
          fill.style.width = `${Math.min(100, v * 100)}%`;
          if (v >= 1) {
            stopHold();
            stage.querySelectorAll(".suds").forEach((s) => s.remove());
            next();
          }
        }, 30);
      }
    });
    stage.addEventListener("pointermove", (e) => {
      if (down && step === 0) scrubAt(e);
    });
    const up = () => {
      down = false;
      if (holdTimer) {
        stopHold();
        if (step === 1) fill.style.width = "0%";
      }
    };
    stage.addEventListener("pointerup", up);
    stage.addEventListener("pointercancel", up);

    const fact = el("div", "case-feedback info");
    fact.append(el("span", "case-feedback-icon", "i"), el("span", "", "Clean tools keep germs away from sensitive, broken skin."));

    const footer: HTMLElement[] = [rack];
    if (isEvent) {
      const actions = el("div", "event-actions");
      const later = el("button", "secondary-btn", "Later");
      later.addEventListener("click", () => this.overlay.close());
      actions.append(later, rack);
      const skip = el("button", "link-btn", "Let Amy do it later");
      skip.addEventListener("click", () => {
        outcome = "dismissed";
        this.overlay.close();
      });
      footer.splice(0, 1, actions, skip);
    }

    render();
    this.overlay.body.replaceChildren(speech, dots, stage, meter, note, fact);
    this.overlay.footer.replaceChildren(...footer);
    this.overlay.open(() => {
      stopHold();
      timers.forEach((t) => window.clearTimeout(t));
      done(outcome);
    });
  }
}
